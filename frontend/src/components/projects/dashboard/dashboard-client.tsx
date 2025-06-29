"use client";

import { useState } from "react";
import useSWR from "swr";

import { getProjects } from "@/actions/project";
import { inviteCollaborator } from "@/actions/project-invitation";
import { useNotificationStore } from "@/stores/notification-store";
import { useProjectStore } from "@/stores/project-store";
import { useUserStore } from "@/stores/user-store";
import type { API } from "@/types/api-types";
import { DeleteProjectModal } from "../modals/delete-project-modal";
import { InviteCollaboratorModal } from "../modals/invite-collaborator-modal";
import { DashboardCreateProjectModal } from "./dashboard-create-project-modal";
import { DashboardHeader } from "./dashboard-header";
import { DashboardProjectCard } from "./dashboard-project-card";
import { DashboardStats } from "./dashboard-stats";
import { WelcomeModal } from "./welcome/welcome-modal";

interface DashboardClientProps {
	initialProjects: API.ListProjects.Http200.ResponseBody;
}

export function DashboardClient({ initialProjects }: DashboardClientProps) {
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [projectToDelete, setProjectToDelete] = useState<null | string>(null);
	const [selectedProjectForInvite, setSelectedProjectForInvite] = useState<
		API.ListProjects.Http200.ResponseBody[0] | null
	>(null);
	const { deleteProject, duplicateProject } = useProjectStore();
	const { addNotification } = useNotificationStore();
	const { user } = useUserStore();

	const handleDuplicateProject = async (projectId: string) => {
		await duplicateProject(projectId);
	};

	// Commented out test notifications that were interfering with integration tests
	// TODO: Add a feature flag for dev-only notifications
	// useEffect(() => {
	// 	const timeouts = [
	// 		setTimeout(() => {
	// 			addNotification({
	// 				message: "is due in 7 days. Make sure everything is ready for submission.",
	// 				projectName: "Neuroadaptive Interfaces - EIC Pathfinder",
	// 				title: "7 days until grant deadline",
	// 				type: "deadline",
	// 			});
	// 		}, 1000),
	// 		setTimeout(() => {
	// 			addNotification({
	// 				message: "is due in 7 days. Make sure everything is ready for submission.",
	// 				projectName: "Neuroadaptive Interfaces - EIC Pathfinder",
	// 				title: "7 days until grant deadline",
	// 				type: "deadline",
	// 			});
	// 		}, 2000),
	// 		setTimeout(() => {
	// 			addNotification({
	// 				message: "is due in 7 days. Make sure everything is ready for submission.",
	// 				projectName: "Neuroadaptive Interfaces - EIC Pathfinder",
	// 				title: "7 days until grant deadline",
	// 				type: "deadline",
	// 			});
	// 		}, 3000),
	// 	];

	// 	return () => {
	// 		timeouts.forEach(clearTimeout);
	// 	};
	// }, [addNotification]);

	const { data: projects = initialProjects } = useSWR("projects", getProjects, {
		fallbackData: initialProjects,
		revalidateOnFocus: false,
	});

	const handleDeleteProject = (projectId: string) => {
		setProjectToDelete(projectId);
		setShowDeleteModal(true);
	};

	const confirmDeleteProject = async () => {
		if (projectToDelete) {
			await deleteProject(projectToDelete);
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

	return (
		<div className="relative size-full">
			<WelcomeModal
				onStartApplication={() => {
					setShowCreateModal(true);
				}}
			/>
			<div className="flex size-full flex-col items-center">
				<div className="flex size-full flex-col items-center justify-start pb-6 pl-0 pr-0 pt-0">
					<DashboardHeader
						onCreateProject={() => {
							setShowCreateModal(true);
						}}
						onInviteCollaborators={() => {
							if (projects.length > 0) {
								setSelectedProjectForInvite(projects[0]);
								setShowInviteModal(true);
							} else {
								addNotification({
									message: "Create a project first before inviting collaborators",
									projectName: "",
									title: "No projects available",
									type: "info",
								});
							}
						}}
					/>
					<div className="relative min-h-px min-w-px grow shrink-0 basis-0 w-full rounded-lg bg-white">
						<div className="relative size-full overflow-clip">
							<div className="relative flex size-full flex-col items-start justify-start gap-10 px-10 py-14">
								<div className="relative flex w-full shrink-0 flex-col items-start justify-start gap-8">
									<div className="relative flex w-full shrink-0 flex-row items-start justify-between">
										<div className="relative flex shrink-0 flex-col items-start justify-start gap-2">
											<div className="relative flex shrink-0 flex-col justify-center whitespace-nowrap text-[36px] font-medium leading-[0] text-[#2e2d36] font-['Cabin']">
												<p className="block whitespace-pre leading-[42px]">Dashboard</p>
											</div>
											<div className="relative flex shrink-0 flex-row items-start justify-start gap-2">
												<div className="relative flex shrink-0 flex-col justify-center whitespace-nowrap text-[16px] leading-[0] not-italic text-[#636170] font-['Source_Sans_Pro']">
													<p className="block whitespace-pre leading-[20px]">
														Your one‑stop overview for all your Research Projects.
													</p>
												</div>
											</div>
										</div>
									</div>
									<DashboardStats initialProjects={projects} />
								</div>
								<div className="relative flex w-full shrink-0 flex-col items-start justify-start gap-8">
									<div className="relative flex shrink-0 flex-col justify-center whitespace-nowrap text-[28px] font-medium leading-[0] text-[#2e2d36] font-['Cabin']">
										<p className="block whitespace-pre leading-[34px]">Research Projects</p>
									</div>
									<div className="relative flex w-full shrink-0 flex-row items-start justify-start gap-3">
										{projects.length > 0 ? (
											projects.map((project) => (
												<DashboardProjectCard
													key={project.id}
													onDelete={handleDeleteProject}
													onDuplicate={handleDuplicateProject}
													project={project}
												/>
											))
										) : (
											<div className="flex w-full flex-col items-center justify-center py-12">
												<p className="text-[#636170] mb-4">
													You don&apos;t have any projects yet.
												</p>
												<button
													className="rounded bg-[#1e13f8] px-4 py-2 text-white"
													onClick={() => {
														setShowCreateModal(true);
													}}
													type="button"
												>
													Create Your First Project
												</button>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
						<div className="pointer-events-none absolute inset-0 rounded-lg border border-solid border-[#e1dfeb]" />
					</div>
				</div>
			</div>

			<DashboardCreateProjectModal
				isOpen={showCreateModal}
				onClose={() => {
					setShowCreateModal(false);
				}}
			/>

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
