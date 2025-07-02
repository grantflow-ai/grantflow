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
import { AppButton, AvatarGroup } from "@/components/app";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus } from "lucide-react";

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
  // Feature flag for dev-only notifications would be helpful here
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

  const handleInviteCollaborator = async (
    email: string,
    permission: "admin" | "collaborator"
  ) => {
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
  const projectTeamMembers = [
    { backgroundColor: "#369e94", initials: "NH" },
    { backgroundColor: "#9e366f", initials: "VH" },
    { backgroundColor: "#9747ff", initials: "AR" },
  ];
  return (
    <div className="relative size-full">
      <WelcomeModal
        onStartApplication={() => {
          setShowCreateModal(true);
        }}
      />
      <section className="bg-preview-bg w-full h-full  flex">
        <main className="w-[98%] h-full">
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
                  message:
                    "Create a project first before inviting collaborators",
                  projectName: "",
                  title: "No projects available",
                  type: "info",
                });
              }
            }}
            projectTeamMembers={projectTeamMembers}
          />

          <main className=" px-10 flex flex-col gap-10 py-14 rounded-lg bg-white border border-gray-200">
            <main className="flex flex-col gap-8">
              <article className="text-black flex justify-between items-center">
                <div className="flex flex-col gap-2">
                  <h2 className="font-medium text-4xl ">Dashboard</h2>
                  <p className="font-normal text-base text-gray-600">
                    Your one‑stop overview for all your Research Projects.
                  </p>
                </div>
                <div className="flex gap-6">
                  <main className=" flex justify-end items-center gap-2">
                    <div className="size-8 flex items-center justify-center bg-gray-50 rounded-xs cursor-pointer">
                      <Tooltip>
                        <TooltipTrigger className="cursor-pointer">
                          <Plus className="size-2.5 text-primary " />
                        </TooltipTrigger>
                        <TooltipContent className="bg-app-dark-blue px-3 py-1 rounded-xs">
                          <p className="text-white font-normal text-base">
                            Invite collaborators
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="  ">
                      <AvatarGroup size="md" users={projectTeamMembers} />
                    </div>
                  </main>
                  <AppButton variant="primary" className="px-4 py-2">
                    <p className="font-normal text-base">
                      + New Research Project
                    </p>
                  </AppButton>
                </div>
              </article>

              <DashboardStats initialProjects={projects} />
            </main>
            <main className="">
                <h3 className="font-normal text-4xl text-black">
                Research Projects
              </h3>
              <main className="flex items-center gap-4 flex-wrap mt-6">
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <DashboardProjectCard
                      key={project.id}
                      onDelete={handleDeleteProject}
                      onDuplicate={handleDuplicateProject}
                      project={project}
                      projectTeamMembers={projectTeamMembers}
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
              </main>
            </main>
          </main>
          <div className="pointer-events-none absolute inset-0 rounded-lg border border-solid border-[#e1dfeb]" />
        </main>
      </section>

      <DashboardCreateProjectModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
        }}
      />

      <DeleteProjectModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteProject}
      />

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
