"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { createProject } from "@/actions/project";
import { inviteCollaborator } from "@/actions/project-invitation";
import { AvatarGroup } from "@/components/app";
import { AppHeader } from "@/components/layout/app-header";
import { DashboardProjectCard, DeleteProjectModal, InviteCollaboratorModal } from "@/components/projects";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigationStore } from "@/stores/navigation-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useProjectStore } from "@/stores/project-store";
import { useUserStore } from "@/stores/user-store";
import type { API } from "@/types/api-types";
import { routes } from "@/utils/navigation";
import { generateBackgroundColor, generateInitials } from "@/utils/user";
import PaymentLink from "../payment/payment-link";
import { DashboardStats } from "./dashboard-stats";
import { WelcomeModal } from "./welcome/welcome-modal";

interface DashboardClientProps {
	initialProjects: API.ListProjects.Http200.ResponseBody;
}

export function DashboardClient({ initialProjects }: DashboardClientProps) {
	const router = useRouter();
	const { navigateToProject } = useNavigationStore();

	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [projectToDelete, setProjectToDelete] = useState<null | string>(null);
	const [selectedProjectForInvite, setSelectedProjectForInvite] = useState<
		API.ListProjects.Http200.ResponseBody[0] | null
	>(null);
	const [isCreatingProject, setIsCreatingProject] = useState(false);

	const { deleteProject, duplicateProject, getProjects } = useProjectStore();
	const { addNotification } = useNotificationStore();
	const { user } = useUserStore();

	const handleDuplicateProject = async (projectId: string) => {
		await duplicateProject(projectId);
	};

	const handleProjectNavigation = (projectId: string, projectName: string) => {
		// Set project context in navigation store for parameter-free routing
		// The NavigationContextProvider will handle data loading based on this context
		navigateToProject(projectId, projectName);
		router.push(routes.project.detail());
	};

	const { data: projects = initialProjects, mutate } = useSWR("projects", getProjects, {
		fallback: initialProjects,
		revalidateOnFocus: false,
	});

	// Generate team members from all projects
	const projectTeamMembers = projects
		.flatMap((project) => project.members)
		.reduce<{ backgroundColor: string; imageUrl?: string; initials: string; uid: string }[]>((acc, member) => {
			// Avoid duplicates by checking if user already exists (by firebase_uid)
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
		.map(({ uid: _uid, ...member }) => member); // Remove uid from final result

	const handleDeleteProject = (projectId: string) => {
		setProjectToDelete(projectId);
		setShowDeleteModal(true);
	};

	const confirmDeleteProject = async () => {
		if (projectToDelete) {
			await deleteProject(projectToDelete);
			await mutate();
			setProjectToDelete(null);
		}
	};

	const closeDeleteModal = () => {
		setShowDeleteModal(false);
		setProjectToDelete(null);
	};

	const handleInviteCollaborator = async (email: string, permission: "admin" | "collaborator") => {
		if (!selectedProjectForInvite) {
			addNotification({
				message: "Please select a project first",
				projectName: "",
				title: "No project selected",
				type: "warning",
			});
			return;
		}

		try {
			const result = await inviteCollaborator({
				email,
				inviterName: user?.displayName ?? user?.email ?? "Team Member",
				projectId: selectedProjectForInvite.id,
				projectName: selectedProjectForInvite.name,
				role: permission === "admin" ? "admin" : "member",
			});

			if (result.success) {
				addNotification({
					message: `Invitation sent successfully to ${email}`,
					projectName: selectedProjectForInvite.name,
					title: "Collaborator invited",
					type: "success",
				});
			} else {
				addNotification({
					message: result.error ?? "Failed to send invitation",
					projectName: selectedProjectForInvite.name,
					title: "Invitation failed",
					type: "warning",
				});
			}
		} catch {
			addNotification({
				message: "An error occurred while sending the invitation",
				projectName: selectedProjectForInvite.name,
				title: "Error",
				type: "warning",
			});
		}
	};

	const handleCreateProject = async () => {
		if (isCreatingProject) return;

		setIsCreatingProject(true);
		try {
			const newProjectName = `New Project ${projects.length + 1}`;
			const { id: projectId } = await createProject({
				description: "",
				name: newProjectName,
			});

			// Refresh projects list
			await mutate();

			// Navigate to the new project
			navigateToProject(projectId, newProjectName);
			router.push(routes.project.detail());
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

		// Find the default project (first project or one named "default")
		const [defaultProject] = projects;

		// Navigate to application creation
		navigateToProject(defaultProject.id, defaultProject.name);
		router.push(routes.project.applications.new());
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
						className="mx-6 mb-6 px-10 relative flex flex-col gap-10 py-14 rounded-lg bg-white border border-app-gray-100 min-h-0"
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
									<main className="flex justify-end items-center gap-1">
										<button
											className="size-8 flex items-center justify-center bg-app-gray-100/50 rounded-sm hover:bg-app-gray-100 transition-colors p-1"
											data-testid="invite-collaborators-button"
											onClick={() => {
												if (projects.length > 0) {
													setSelectedProjectForInvite(projects[0]);
													setShowInviteModal(true);
												}
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
										<div>
											<AvatarGroup
												data-testid="dashboard-avatar-group"
												size="md"
												users={projectTeamMembers}
											/>
										</div>
									</main>
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
						<main className="">
							<h3
								className="font-heading font-medium text-[28px] leading-[34px] text-app-black"
								data-testid="research-projects-heading"
							>
								Research Projects
							</h3>
							<main className="flex items-center gap-4 flex-wrap mt-6" data-testid="projects-container">
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

			<InviteCollaboratorModal
				isOpen={showInviteModal}
				onClose={() => {
					setShowInviteModal(false);
					setSelectedProjectForInvite(null);
				}}
				onInvite={handleInviteCollaborator}
			/>
		</div>
	);
}
