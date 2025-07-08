"use client";

import { assertIsNotNullish } from "@tool-belt/type-predicates";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { getProjects } from "@/actions/project";
import { inviteCollaborator } from "@/actions/project-invitation";
import { AppButton, AvatarGroup } from "@/components/app";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import PaymentLink from "../payment/payment-link";


interface DashboardClientProps {
  initialProjects: API.ListProjects.Http200.ResponseBody;
}

const projectTeamMembers = [
  { backgroundColor: "#369e94", initials: "NH" },
  { backgroundColor: "#9e366f", initials: "VH" },
  { backgroundColor: "#9747ff", initials: "AR" },
];

export function DashboardClient({ initialProjects }: DashboardClientProps) {
	const router = useRouter();
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

	const handleProjectNavigation = (projectId: string) => {
		assertIsNotNullish(projectId);
		router.push(`/projects/${projectId}`);
	};

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
  return (
    <div className="relative size-full">
      <WelcomeModal
        onStartApplication={() => {
          setShowCreateModal(true);
        }}
      />
      <section className="bg-preview-bg w-full h-full  flex">
        <main className="w-[98%] pb-5">
          <DashboardHeader
            data-testid="dashboard-header"
            projectTeamMembers={projectTeamMembers}
          />

          <main className=" px-10 relative flex h-[863px] flex-col gap-10 py-14 rounded-lg bg-white border border-gray-200">
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
                        <TooltipTrigger
                          className="cursor-pointer"
                          data-testid="invite-collaborators-button"
                        >
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
                  <AppButton className="px-4 py-2" variant="primary">
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
                      data-testid="dashboard-project-card"
                      key={project.id}
                      onClick={handleProjectNavigation}
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
                      data-testid="create-first-project-button"
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
          <PaymentLink />
          </main>

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
