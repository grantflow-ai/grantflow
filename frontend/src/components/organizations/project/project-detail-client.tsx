"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import {
	deleteApplication,
	downloadApplication,
	duplicateApplication,
	listApplications,
} from "@/actions/grant-applications";
import { getOrganizationMembers } from "@/actions/organization";
import { getProjectMembers } from "@/actions/project";
import { inviteCollaborator } from "@/actions/project-invitation";
import AppHeader from "@/components/layout/app-header";
import type { InviteOptions } from "@/components/organizations/modals/invite-collaborator-modal";
import { InviteCollaboratorModal } from "@/components/organizations/modals/invite-collaborator-modal";
import NewApplicationModal from "@/components/organizations/modals/new-application-modal";
import { ApplicationList } from "@/components/organizations/project/application-list";
import { DeleteApplicationModal } from "@/components/organizations/project/delete-application-modal";
import ProjectActions from "@/components/organizations/project/project-actions";
import ProjectTitle from "@/components/organizations/project/project-title";
import { DOWNLOAD_FORMATS } from "@/constants/download";
import { useProjectTitleEditing } from "@/hooks/use-project-title-editing";
import { useNavigationStore } from "@/stores/navigation-store";
import { useNewApplicationModalStore } from "@/stores/new-application-modal-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { useUserStore } from "@/stores/user-store";
import type { API } from "@/types/api-types";
import type { DownloadFormat } from "@/types/download";
import { UserRole } from "@/types/user";
import { log } from "@/utils/logger/client";
import { routes } from "@/utils/navigation";
import { TrackingEvents, trackEvent } from "@/utils/tracking";
import { generateBackgroundColor, generateInitials } from "@/utils/user";

export function ProjectDetailClient() {
	const router = useRouter();
	const { project } = useProjectStore();
	const { selectedOrganizationId } = useOrganizationStore();
	const { clearActiveApplication, navigateToApplication, navigateToProject, stateHydrated } = useNavigationStore();
	const { user } = useUserStore();
	const { closeModal, isModalOpen } = useNewApplicationModalStore();
	const { getProjects, projects } = useProjectStore();

	const {
		handleSave: handleSaveProjectTitle,
		isEditing: isEditingTitle,
		isFirstEdit,
		setIsEditing: setIsEditingTitle,
		title: projectTitle,
		titleInputRef,
	} = useProjectTitleEditing({
		initialTitle: project?.name ?? "",
		organizationId: selectedOrganizationId ?? "",
		projectId: project?.id ?? "",
	});

	const [searchQuery, setSearchQuery] = useState("");
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [applicationToDelete, setApplicationToDelete] = useState<null | string>(null);
	const [isCreatingApplication, setIsCreatingApplication] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [downloadingApplications, setDownloadingApplications] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (project) {
			setIsLoading(false);
		}
	}, [project]);

	useEffect(() => {
		if (stateHydrated) {
			clearActiveApplication();
		}
	}, [clearActiveApplication, stateHydrated]);

	useEffect(() => {
		if (selectedOrganizationId) {
			void getProjects(selectedOrganizationId);
		}
	}, [selectedOrganizationId, getProjects]);

	const applicationsKey =
		project && selectedOrganizationId
			? `/organizations/${selectedOrganizationId}/projects/${project.id}/applications?search=${searchQuery}`
			: null;

	const fetchApplications = () => {
		if (!(project && selectedOrganizationId)) {
			return null;
		}
		const searchParams = searchQuery ? { search: searchQuery } : {};
		return listApplications(selectedOrganizationId, project.id, searchParams);
	};

	const { data: applicationsData, isLoading: isApplicationsLoading } = useSWR(applicationsKey, fetchApplications, {
		revalidateOnFocus: false,
	});

	const { data: OrganizationMember } = useSWR(
		selectedOrganizationId ? `/organizations/${selectedOrganizationId}/members` : null,
		() => (selectedOrganizationId ? getOrganizationMembers(selectedOrganizationId) : null),
		{
			revalidateOnFocus: false,
		},
	);

	const { data: projectMembers, mutate: mutateMembers } = useSWR(
		project && selectedOrganizationId
			? `/organizations/${selectedOrganizationId}/projects/${project.id}/members`
			: null,
		() => (project && selectedOrganizationId ? getProjectMembers(selectedOrganizationId, project.id) : null),
		{
			revalidateOnFocus: false,
		},
	);

	const applications = applicationsData?.applications ?? [];

	const projectTeamMembers =
		projectMembers?.reduce<
			{
				backgroundColor: string;
				imageUrl?: string;
				initials: string;
				uid: string;
			}[]
		>((acc, member) => {
			const existingMember = acc.find((existing) => existing.uid === member.firebase_uid);
			if (!existingMember) {
				acc.push({
					backgroundColor: generateBackgroundColor(member.firebase_uid),
					initials: generateInitials(member.display_name ?? undefined, member.email),
					uid: member.firebase_uid,
					...(member.photo_url && { imageUrl: member.photo_url }),
				});
			}
			return acc;
		}, []) ?? [];

	const handleDeleteApplication = (applicationId: string) => {
		setApplicationToDelete(applicationId);
		setShowDeleteModal(true);
	};

	const confirmDeleteApplication = async () => {
		if (applicationToDelete && project && selectedOrganizationId) {
			const swrKey = `/organizations/${selectedOrganizationId}/projects/${project.id}/applications?search=${searchQuery}`;
			const baseKey = `/organizations/${selectedOrganizationId}/projects/${project.id}/applications`;

			try {
				await mutate(
					swrKey,
					(currentData: typeof applicationsData) => {
						if (!currentData) return currentData;
						return {
							...currentData,
							applications: currentData.applications.filter((app) => app.id !== applicationToDelete),
						};
					},
					false,
				);

				const { removeApplicationFromProject } = useProjectStore.getState();
				removeApplicationFromProject(applicationToDelete);

				await deleteApplication(selectedOrganizationId, project.id, applicationToDelete);

				await mutate(swrKey);
				await mutate(baseKey);

				toast.success("Application deleted successfully");
			} catch (error) {
				log.error("delete-application", error);
				toast.error("Failed to delete application");

				await mutate(swrKey);
			} finally {
				setApplicationToDelete(null);
				setShowDeleteModal(false);
			}
		}
	};

	const handleDuplicateApplication = async (applicationId: string, currentTitle: string) => {
		if (!(project && selectedOrganizationId)) return;
		try {
			const newTitle = `Copy of ${currentTitle}`;
			const duplicatedApp = await duplicateApplication(
				selectedOrganizationId,
				project.id,
				applicationId,
				newTitle,
			);

			await mutate(
				`/organizations/${selectedOrganizationId}/projects/${project.id}/applications?search=${searchQuery}`,
			);
			await mutate(`/organizations/${selectedOrganizationId}/projects/${project.id}/applications`);

			toast.success("Application duplicated successfully");

			navigateToApplication(project.id, project.name, duplicatedApp.id, duplicatedApp.title || newTitle);
			const wizardPath = routes.organization.project.application.wizard();
			router.push(wizardPath);
		} catch (error) {
			log.error("duplicate-application", error);
			toast.error("Failed to duplicate application");
		}
	};

	const handleCreateApplication = async () => {
		if (!(project && selectedOrganizationId)) return;
		setIsCreatingApplication(true);

		try {
			await trackEvent(TrackingEvents.CTA_NEW_APPLICATION_MAIN, {
				organizationId: selectedOrganizationId,
				projectId: project.id,
				source: "project-actions-header",
			});

			navigateToProject(project.id, project.name);
			closeModal();
			router.push(routes.organization.project.application.new());
		} catch (error) {
			log.error("create-application-button", error);
			toast.error("Failed to create application");
			setIsCreatingApplication(false);
		}
	};

	const handleOpenApplication = (application: API.ListApplications.Http200.ResponseBody["applications"][0]) => {
		if (!project) return;

		navigateToApplication(project.id, project.name, application.id, application.title);
		if (application.status === "WORKING_DRAFT") {
			const editorPath = routes.organization.project.application.editor();
			router.push(editorPath);
		} else {
			const wizardPath = routes.organization.project.application.wizard();
			router.push(wizardPath);
		}
	};

	const handleDownloadApplication = async (applicationId: string, format: DownloadFormat) => {
		if (!(project && selectedOrganizationId)) return;

		setDownloadingApplications((prev) => new Set([applicationId, ...prev]));

		try {
			toast.loading(`Preparing ${DOWNLOAD_FORMATS[format].label} download...`, {
				id: `download-${applicationId}`,
			});

			const blob = await downloadApplication(selectedOrganizationId, project.id, applicationId, format);

			const downloadUrl = globalThis.URL.createObjectURL(blob);
			const application = applications.find((app) => app.id === applicationId);
			const title = application?.title ?? "application";
			const sanitizedTitle = title.replaceAll(/[^a-zA-Z0-9\-_]/g, "_");
			const filename = `${sanitizedTitle}.${DOWNLOAD_FORMATS[format].extension}`;

			const link = document.createElement("a");
			link.href = downloadUrl;
			link.download = filename;
			document.body.append(link);
			link.click();
			link.remove();

			globalThis.URL.revokeObjectURL(downloadUrl);

			toast.success(`${DOWNLOAD_FORMATS[format].label} downloaded successfully`, {
				id: `download-${applicationId}`,
			});
		} catch (error) {
			log.error("download-application", error);
			toast.error(`Failed to download ${DOWNLOAD_FORMATS[format].label.toLowerCase()}`, {
				id: `download-${applicationId}`,
			});
		} finally {
			setDownloadingApplications((prev) => {
				const newSet = new Set(prev);
				newSet.delete(applicationId);
				return newSet;
			});
		}
	};

	const handleInviteCollaborator = async (options: InviteOptions) => {
		if (!project) {
			toast.error("Current project not found. Please refresh and try again.");
			return;
		}

		if (!selectedOrganizationId) {
			toast.error("Organization not selected. Please select an organization.");
			return;
		}

		try {
			const result = await inviteCollaborator({
				email: options.email,
				inviterName: user?.displayName ?? user?.email ?? "Team Member",
				organizationId: selectedOrganizationId,
				projectId: project.id,
				projectName: project.name,
				role: options.role === "ADMIN" ? "admin" : "member",
			});

			if (result.success) {
				toast.success(`Invitation sent successfully to ${options.email}`);
				await mutateMembers();
			} else {
				toast.error(result.error ?? "Failed to send invitation");
			}
		} catch {
			toast.error("An error occurred while sending the invitation.");
		}
	};

	if (isLoading) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<p className="text-app-gray-600">Loading project...</p>
			</div>
		);
	}

	if (!project) {
		return null;
	}

	const currentUserRole =
		projectMembers?.find((member) => member.firebase_uid === user?.uid)?.role ?? UserRole.COLLABORATOR;
	const ownerEmail = OrganizationMember?.find((member) => member.role === "OWNER")?.email;

	return (
		<section className="w-full h-full overflow-y-scroll flex flex-col">
			<AppHeader projectTeamMembers={projectTeamMembers} />

			<main className="flex-1 flex flex-col">
				<main
					className=" mb-6 px-10 relative flex flex-col gap-6 py-6 rounded-lg bg-white border border-app-gray-100 flex-1 min-h-0"
					data-testid="project-header"
				>
					<div className="flex items-center justify-between">
						<ProjectTitle
							isEditing={isEditingTitle}
							isFirstEdit={isFirstEdit}
							onSave={handleSaveProjectTitle}
							onSetIsEditing={setIsEditingTitle}
							title={projectTitle}
							titleInputRef={titleInputRef as React.RefObject<HTMLDivElement>}
						/>
						<ProjectActions
							currentUserRole={currentUserRole}
							isCreatingApplication={isCreatingApplication}
							onCreateApplication={handleCreateApplication}
							onSearchQueryChange={setSearchQuery}
							onShowInviteModal={() => {
								setShowInviteModal(true);
							}}
							searchQuery={searchQuery}
							teamMembers={projectTeamMembers}
						/>
					</div>

					<div className="flex-1 overflow-auto min-h-0" data-testid="applications-section">
						<ApplicationList
							applications={applications}
							downloadingApplications={downloadingApplications}
							isCreatingApplication={isCreatingApplication}
							isLoading={isApplicationsLoading}
							onCreate={handleCreateApplication}
							onDelete={handleDeleteApplication}
							onDownload={handleDownloadApplication}
							onDuplicate={handleDuplicateApplication}
							onOpen={handleOpenApplication}
							searchQuery={searchQuery}
						/>
					</div>
				</main>
			</main>

			<DeleteApplicationModal
				isOpen={showDeleteModal}
				onClose={() => {
					setShowDeleteModal(false);
					setApplicationToDelete(null);
				}}
				onConfirm={confirmDeleteApplication}
			/>

			<InviteCollaboratorModal
				currentUserRole={UserRole.OWNER}
				isOpen={showInviteModal}
				onClose={() => {
					setShowInviteModal(false);
				}}
				onInvite={handleInviteCollaborator}
				ownerEmail={ownerEmail ?? ""}
				projectId={project.id}
				projects={projects.map((p) => ({ id: p.id, name: p.name }))}
			/>

			<NewApplicationModal
				isOpen={isModalOpen}
				onClose={closeModal}
				onCreate={handleCreateApplication}
				projects={projects}
			/>
		</section>
	);
}
