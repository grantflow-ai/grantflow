"use client";

import { PencilIcon, Plus, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import {
	createApplication,
	deleteApplication,
	duplicateApplication,
	listApplications,
} from "@/actions/grant-applications";
import { getProjectMembers } from "@/actions/project";
import { inviteCollaborator } from "@/actions/project-invitation";
import { AppButton, AvatarGroup } from "@/components/app";
import { AppHeader } from "@/components/layout/app-header";
import { InviteCollaboratorModal } from "@/components/organizations";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { useNavigationStore } from "@/stores/navigation-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { useUserStore } from "@/stores/user-store";
import { log } from "@/utils/logger";
import { routes } from "@/utils/navigation";
import { generateBackgroundColor, generateInitials } from "@/utils/user";
import { ApplicationList } from "./application-list";
import { DeleteApplicationModal } from "./applications/delete-application-modal";

export function ProjectDetailClient() {
	const router = useRouter();
	const { project, updateProject } = useProjectStore();
	const { selectedOrganizationId } = useOrganizationStore();
	const { navigateToApplication } = useNavigationStore();
	const { user } = useUserStore();

	const [searchQuery, setSearchQuery] = useState("");
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [projectTitle, setProjectTitle] = useState(project?.name ?? "");
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [applicationToDelete, setApplicationToDelete] = useState<null | string>(null);
	const [isCreatingApplication, setIsCreatingApplication] = useState(false);
	const titleInputRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isEditingTitle && titleInputRef.current) {
			titleInputRef.current.focus();
		}
	}, [isEditingTitle]);

	useEffect(() => {
		if (!project) {
			router.replace(routes.organization.root());
		}
	}, [project, router]);

	useEffect(() => {
		if (project?.name) {
			setProjectTitle(project.name);
		}
	}, [project?.name]);

	const { data: applicationsData, isLoading } = useSWR(
		project && selectedOrganizationId
			? `/organizations/${selectedOrganizationId}/projects/${project.id}/applications?search=${searchQuery}`
			: null,
		() =>
			project && selectedOrganizationId
				? listApplications(selectedOrganizationId, project.id, { search: searchQuery || undefined })
				: null,
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
		projectMembers?.reduce<{ backgroundColor: string; imageUrl?: string; initials: string; uid: string }[]>(
			(acc, member) => {
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
			},
			[],
		) ?? [];

	const handleDeleteApplication = (applicationId: string) => {
		setApplicationToDelete(applicationId);
		setShowDeleteModal(true);
	};

	const confirmDeleteApplication = async () => {
		if (applicationToDelete && project && selectedOrganizationId) {
			try {
				await deleteApplication(selectedOrganizationId, project.id, applicationToDelete);
				await mutate(`/organizations/${selectedOrganizationId}/projects/${project.id}/applications`);
				toast.success("Application deleted successfully");
				setApplicationToDelete(null);
				setShowDeleteModal(false);
			} catch (error) {
				log.error("delete-application", error);
				toast.error("Failed to delete application");
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
			const application = await createApplication(selectedOrganizationId, project.id, {
				title: DEFAULT_APPLICATION_TITLE,
			});
			await mutate(`/organizations/${selectedOrganizationId}/projects/${project.id}/applications`);

			navigateToApplication(
				project.id,
				project.name,
				application.id,
				application.title || DEFAULT_APPLICATION_TITLE,
			);
			const wizardPath = routes.organization.project.application.wizard();
			router.push(wizardPath);
		} catch (error) {
			log.error("create-application-button", error);
			toast.error("Failed to create application");
			setIsCreatingApplication(false);
		}
	};

	const handleOpenApplication = (applicationId: string, applicationTitle: string) => {
		if (!project) return;

		navigateToApplication(project.id, project.name, applicationId, applicationTitle);
		const wizardPath = routes.organization.project.application.wizard();
		router.push(wizardPath);
	};

	const handleSaveProjectTitle = async () => {
		const newTitle = titleInputRef.current?.textContent?.trim() ?? "";
		if (newTitle && newTitle !== project?.name && project && selectedOrganizationId) {
			try {
				await updateProject(selectedOrganizationId, project.id, {
					description: null,
					logo_url: null,
					name: newTitle,
				});
				setProjectTitle(newTitle);
				toast.success("Project title updated successfully!");
			} catch {
				toast.error("Failed to update project title.");
			}
		}
		setIsEditingTitle(false);
	};

	const handleInviteCollaborator = async (email: string, permission: "admin" | "collaborator") => {
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
				email,
				inviterName: user?.displayName ?? user?.email ?? "Team Member",
				organizationId: selectedOrganizationId,
				projectId: project.id,
				projectName: project.name,
				role: permission === "admin" ? "admin" : "member",
			});

			if (result.success) {
				toast.success(`Invitation sent successfully to ${email}`);
				await mutateMembers();
			} else {
				toast.error(result.error ?? "Failed to send invitation");
			}
		} catch {
			toast.error("An error occurred while sending the invitation.");
		}
	};

	if (!project) {
		return null;
	}

	const currentUserRole = projectMembers?.find((member) => member.firebase_uid === user?.uid)?.role;

	return (
		<section className="w-full h-full overflow-y-scroll flex flex-col">
			<AppHeader projectTeamMembers={projectTeamMembers} />

			<main className="flex-1 flex flex-col">
				<main
					className="mx-6 mb-6 px-10 relative flex flex-col gap-6 py-6 rounded-lg bg-white border border-app-gray-100 flex-1 min-h-0"
					data-testid="project-header"
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{isEditingTitle ? (
								// biome-ignore lint/a11y/useSemanticElements: Using a div with contentEditable for custom styling
								<div
									aria-label="Project Title"
									className="font-medium text-[36px] leading-[42px] text-gray-300 outline-none border-b-2  border-primary focus:ring-offset-2  "
									contentEditable={true}
									onBlur={handleSaveProjectTitle}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											void handleSaveProjectTitle();
										}
									}}
									ref={titleInputRef as React.RefObject<HTMLDivElement>}
									role="textbox"
									suppressContentEditableWarning={true}
									tabIndex={0}
								>
									{projectTitle}
								</div>
							) : (
								<h1 className="font-medium text-[36px] leading-[42px] text-app-black">
									{projectTitle}
								</h1>
							)}
							{
								<button
									className="flex size-6 items-center justify-center text-app-gray-600 hover:text-app-black cursor-pointer"
									onClick={() => {
										setIsEditingTitle(true);
									}}
									type="button"
								>
									<PencilIcon className={`size-5 ${isEditingTitle ? "text-app-black" : ""} `} />
								</button>
							}
						</div>

						<div className="flex items-center gap-3">
							<div className="flex justify-end items-center gap-1">
								{currentUserRole === "ADMIN" ||
									(currentUserRole === "OWNER" && (
										<button
											className="size-8 flex items-center justify-center cursor-pointer bg-app-gray-100/50 rounded-sm hover:bg-app-gray-100 transition-colors p-1"
											data-testid="invite-collaborators-button"
											onClick={() => {
												setShowInviteModal(true);
											}}
											type="button"
										>
											<Tooltip>
												<TooltipTrigger asChild>
													<Plus className="size-4 text-app-gray-600" />
												</TooltipTrigger>
												<TooltipContent className="bg-app-dark-blue px-3 py-1 rounded-sm">
													<p className="text-white font-body font-normal text-sm">
														Invite collaborators
													</p>
												</TooltipContent>
											</Tooltip>
										</button>
									))}
								<div>
									<AvatarGroup
										data-testid="project-avatar-group"
										size="md"
										users={projectTeamMembers}
									/>
								</div>
							</div>
							<div className="relative w-80 ">
								<SearchIcon className="absolute right-3 top-1/2 size-3 -translate-y-1/2 text-[#636170]" />
								<input
									className="w-full h-10 rounded-[4px] px-3 border border-[#e1dfeb] bg-white   text-[14px] text-base text-black placeholder:text-gray-400 placeholder:font-normal placeholder:text-sm outline-none focus:border-[#1e13f8]"
									data-testid="application-search-input"
									onChange={(e) => {
										setSearchQuery(e.target.value);
									}}
									placeholder="Search by application name or content"
									value={searchQuery}
								/>
							</div>

							<AppButton
								className="px-4 py-2"
								data-testid="new-application-button"
								disabled={isCreatingApplication}
								onClick={handleCreateApplication}
								type="button"
								variant="primary"
							>
								<Plus className="size-4" />
								<p className="font-normal text-base">New Application</p>
							</AppButton>
						</div>
					</div>

					<div className="flex-1 overflow-auto min-h-0" data-testid="applications-section">
						<ApplicationList
							applications={applications}
							isCreatingApplication={isCreatingApplication}
							isLoading={isLoading}
							onCreate={handleCreateApplication}
							onDelete={handleDeleteApplication}
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
				isOpen={showInviteModal}
				onClose={() => {
					setShowInviteModal(false);
				}}
				onInvite={handleInviteCollaborator}
				
			/>
		</section>
	);
}
