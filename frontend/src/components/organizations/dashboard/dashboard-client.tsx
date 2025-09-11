"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import {
	createProject,
	deleteProject as deleteProjectAction,
	duplicateProject as duplicateProjectAction,
	getProjects,
} from "@/actions/project";
import AppHeader from "@/components/layout/app-header";
import { DashboardProjectCard } from "@/components/organizations/dashboard/dashboard-project-card";
import { DashboardStats } from "@/components/organizations/dashboard/dashboard-stats";
import { WelcomeModal } from "@/components/organizations/dashboard/welcome/welcome-modal";
import { DeleteProjectModal } from "@/components/organizations/modals/delete-project-modal";
import NewApplicationModal from "@/components/organizations/modals/new-application-modal";
import PaymentLink from "@/components/organizations/payment/payment-link";
import { useOrganization } from "@/hooks/use-organization";
import { useNavigationStore } from "@/stores/navigation-store";
import { useNewApplicationModalStore } from "@/stores/new-application-modal-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useOrganizationStore } from "@/stores/organization-store";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger/client";
import { routes } from "@/utils/navigation";
import { generateBackgroundColor, generateInitials } from "@/utils/user";

interface DashboardClientProps {
	initialOrganizations: API.ListOrganizations.Http200.ResponseBody;
	initialProjects: API.ListProjects.Http200.ResponseBody;
	initialSelectedOrganizationId: null | string;
}

export function DashboardClient({
	initialOrganizations,
	initialProjects,
	initialSelectedOrganizationId,
}: DashboardClientProps) {
	const router = useRouter();
	const { navigateToProject } = useNavigationStore();
	const { selectedOrganizationId, switchOrganization } = useOrganization();
	const { selectOrganization, setOrganizations } = useOrganizationStore();
	const { closeModal, isModalOpen } = useNewApplicationModalStore();
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	const [projectToDelete, setProjectToDelete] = useState<null | string>(null);

	const [isCreatingProject, setIsCreatingProject] = useState(false);

	const { addNotification } = useNotificationStore();

	const { getOrganization } = useOrganizationStore();

	useEffect(() => {
		setOrganizations(initialOrganizations);
	}, [initialOrganizations, setOrganizations]);

	const currentOrganizationId = selectedOrganizationId ?? initialSelectedOrganizationId;

	// biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally omitting selectedOrganizationId and switchOrganization to avoid infinite loop
	useEffect(() => {
		if (!selectedOrganizationId && initialSelectedOrganizationId) {
			switchOrganization(initialSelectedOrganizationId);
		}
	}, [initialSelectedOrganizationId]);

	useEffect(() => {
		if (currentOrganizationId) {
			selectOrganization(currentOrganizationId);
		}
	}, [currentOrganizationId, selectOrganization]);

	useEffect(() => {
		if (currentOrganizationId) {
			getOrganization(currentOrganizationId);
		}
	}, [currentOrganizationId, getOrganization]);

	const { data: projects = initialProjects, mutate } = useSWR(
		currentOrganizationId ? ["projects", currentOrganizationId] : null,
		([, orgId]: [string, string]) => getProjects(orgId),
		{
			fallbackData: initialProjects,
			revalidateOnFocus: false,
		},
	);

	const handleDuplicateProject = async (projectId: string) => {
		if (!currentOrganizationId) {
			toast.error("Please select an organization first");
			return;
		}
		const toastId = toast.loading("Duplicating research project");
		try {
			await duplicateProjectAction(currentOrganizationId, projectId);
			await mutate();
			toast.success("Research project duplicated successfully.", { id: toastId });
		} catch (error) {
			log.error("duplicate-project", error);
			toast.error("Failed to duplicate research project.", { id: toastId });
		}
	};

	const handleProjectNavigation = (projectId: string, projectName: string) => {
		navigateToProject(projectId, projectName);
		router.push(routes.organization.project.detail());
	};

	const projectTeamMembers = projects
		.flatMap((project) => project.members)
		.reduce<{ backgroundColor: string; imageUrl?: string; initials: string; uid: string }[]>((acc, member) => {
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
		}, [])
		.map(({ uid: _uid, ...member }) => member);

	const handleDeleteProject = (projectId: string) => {
		setProjectToDelete(projectId);
		setShowDeleteModal(true);
	};

	const confirmDeleteProject = async () => {
		if (projectToDelete && currentOrganizationId) {
			const toastId = toast.loading("Deleting research project...");
			try {
				await deleteProjectAction(currentOrganizationId, projectToDelete);
				await mutate();

				toast.success("Project deleted successfully", { id: toastId });
			} catch (error) {
				log.error("delete-project", error);
				toast.error("Failed to delete project", { id: toastId });
			} finally {
				closeDeleteModal();
			}
		}
	};

	const closeDeleteModal = () => {
		setShowDeleteModal(false);
		setProjectToDelete(null);
	};

	const handleCreateProject = async () => {
		if (isCreatingProject || !currentOrganizationId) return;

		setIsCreatingProject(true);
		try {
			const newProjectName = `New Project ${projects.length + 1}`;
			await createProject(currentOrganizationId, {
				description: "",
				name: newProjectName,
			});
			await mutate();
		} catch {
			addNotification({
				message: "Failed to create project. Please try again.",
				projectName: "",
				title: "Error creating project",
				type: "warning",
			});
		} finally {
			setIsCreatingProject(false);
		}
	};

	const handleStartApplication = () => {
		if (projects.length === 0) {
			addNotification({
				message: "No projects found. Please create a project first.",
				projectName: "",
				title: "No projects",
				type: "warning",
			});
			return;
		}

		const [defaultProject] = projects;

		navigateToProject(defaultProject.id, defaultProject.name);
		router.push(routes.organization.project.application.new());
	};
	const handleCreateApplication = () => {
		closeModal();
	};

	return (
		<div className="relative size-full overflow-y-scroll bg-preview-bg">
			{projects.length === 1 && projects[0].applications_count === 0 && (
				<WelcomeModal onStartApplication={handleStartApplication} />
			)}
			<section className="w-full h-full">
				<main className="w-full h-full flex flex-col">
					<AppHeader data-testid="dashboard-header" projectTeamMembers={projectTeamMembers} />

					<main
						className=" mb-6 px-10 relative flex flex-1 flex-col gap-10 py-14 rounded-lg mr-5  bg-white border border-app-gray-100 min-h-0"
						data-testid="dashboard-main-content"
					>
						<main className="flex flex-col gap-8">
							<article className="text-app-black flex justify-between items-start">
								<div className="flex flex-col gap-2">
									<h2
										className="font-heading font-medium text-[36px] leading-[42px] text-app-black"
										data-testid="dashboard-title"
									>
										Dashboard
									</h2>
									<p className="font-body font-normal text-base text-app-gray-600">
										Your one‑stop overview for all your Research Projects.
									</p>
								</div>
								<div className="flex gap-6 items-center">
									<button
										className="bg-primary text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-link-hover-dark transition-colors"
										data-testid="new-research-project-button"
										disabled={isCreatingProject}
										onClick={handleCreateProject}
										type="button"
									>
										<Plus className="size-4" />
										<span className="font-button font-normal text-base">
											{isCreatingProject ? "Creating..." : "New Research Project"}
										</span>
									</button>
								</div>
							</article>

							<DashboardStats initialProjects={projects} />
						</main>
						<main className="flex flex-col flex-1 min-h-0">
							<h3
								className="font-heading font-medium text-[28px] leading-[34px] text-app-black"
								data-testid="research-projects-heading"
							>
								Research Projects
							</h3>
							<main
								className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-min mt-6  overflow-y-auto pr-2 scroll-box"
								data-testid="projects-container"
							>
								{projects.length > 0 ? (
									projects.map((project) => (
										<DashboardProjectCard
											data-testid="dashboard-project-card"
											key={project.id}
											onClick={() => {
												handleProjectNavigation(project.id, project.name);
											}}
											onDelete={handleDeleteProject}
											onDuplicate={handleDuplicateProject}
											project={project}
											projectTeamMembers={projectTeamMembers}
										/>
									))
								) : (
									<div
										className="flex w-full flex-col items-center justify-center py-12"
										data-testid="empty-projects-state"
									>
										<p className="text-app-gray-600 mb-4 font-body">
											You don&apos;t have any projects yet.
										</p>
										<button
											className="rounded bg-primary px-4 py-2 text-white hover:bg-link-hover-dark transition-colors font-button"
											data-testid="create-first-project-button"
											disabled={isCreatingProject}
											onClick={handleCreateProject}
											type="button"
										>
											{isCreatingProject ? "Creating..." : "Create Your First Project"}
										</button>
									</div>
								)}
							</main>
						</main>
						<PaymentLink />
					</main>
				</main>
			</section>

			<DeleteProjectModal isOpen={showDeleteModal} onClose={closeDeleteModal} onConfirm={confirmDeleteProject} />

			<NewApplicationModal
				isOpen={isModalOpen}
				onClose={closeModal}
				onCreate={handleCreateApplication}
				projects={projects}
			/>
		</div>
	);
}
