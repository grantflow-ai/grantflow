"use client";

import { BellIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { createApplication } from "@/actions/grant-applications";
import { ProjectSettingsAccount, ProjectSettingsMembers, ProjectSidebar } from "@/components/projects";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { useNavigationStore } from "@/stores/navigation-store";
import { useProjectStore } from "@/stores/project-store";
import { useUserStore } from "@/stores/user-store";
import type { UserRole } from "@/types/user";
import { routes } from "@/utils/navigation";
import { ProjectSettingsLayout } from "./project-settings-layout";
import { ProjectSettingsNotifications } from "./project-settings-notifications";

interface ProjectSettingsClientProps {
	activeTab: "account" | "billing" | "members" | "notifications";
}

const mockApplications = [
	{
		id: "1",
		name: "Application Name",
		status: "COMPLETED" as const,
	},
	{
		id: "2",
		name: "Application Name",
		status: "IN_PROGRESS" as const,
	},
	{
		id: "3",
		name: "Application Name",
		status: "DRAFT" as const,
	},
];

export function ProjectSettingsClient({ activeTab }: ProjectSettingsClientProps) {
	const router = useRouter();
	const { user } = useUserStore();
	const { project } = useProjectStore();

	// Redirect if no project context
	useEffect(() => {
		if (!project) {
			router.replace(routes.projects());
		}
	}, [project, router]);

	// Check role for billing/members pages
	useEffect(() => {
		if (project && project.role === "MEMBER" && (activeTab === "billing" || activeTab === "members")) {
			router.replace(routes.project.settings.account());
		}
	}, [project, activeTab, router]);

	if (!project) {
		return null; // Will redirect
	}

	const getInitials = () => {
		if (user?.displayName) {
			return user.displayName
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2);
		}
		return user?.email?.[0]?.toUpperCase() ?? "U";
	};

	const renderSettingsContent = () => {
		switch (activeTab) {
			case "account": {
				return <ProjectSettingsAccount projectId={project.id} userRole={project.role as UserRole} />;
			}
			case "billing": {
				return (
					<div className="flex items-center justify-center h-full" data-testid="billing-settings">
						<p className="text-[#636170]">Billing settings coming soon...</p>
					</div>
				);
			}
			case "members": {
				return (
					<ProjectSettingsMembers
						currentUserRole={project.role as UserRole}
						projectId={project.id}
						projectName={project.name}
					/>
				);
			}
			case "notifications": {
				return <ProjectSettingsNotifications projectId={project.id} />;
			}
		}
	};

	return (
		<div className="flex h-screen bg-[#f6f5f9]" data-testid="settings-container">
			<ProjectSidebar
				applications={mockApplications}
				isCreatingApplication={false}
				onCreateApplication={async () => {
					const { navigateToApplication } = useNavigationStore.getState();
					try {
						const application = await createApplication(project.id, {
							title: DEFAULT_APPLICATION_TITLE,
						});
						navigateToApplication(
							project.id,
							project.name,
							application.id,
							application.title || DEFAULT_APPLICATION_TITLE,
						);
						router.push(routes.application.wizard());
					} catch {
						toast.error("Failed to create application");
					}
				}}
				projectId={project.id}
				userRole={project.role as UserRole}
			/>

			<div className="flex-1 flex flex-col">
				<div
					className="flex items-center justify-between bg-white px-6 py-4 border-b border-[#e1dfeb]"
					data-testid="settings-header"
				>
					<div className="flex items-center gap-3">
						<button
							className="text-[#636170] hover:text-[#2e2d36]"
							onClick={() => {
								router.push(routes.project.detail());
							}}
							type="button"
						>
							←
						</button>
						<h1
							className="font-['Cabin'] font-medium text-[24px] leading-[30px] text-[#2e2d36]"
							data-testid="settings-title"
						>
							Settings
						</h1>
					</div>
					<div className="flex items-center gap-3">
						<button
							className="relative p-2 rounded-full hover:bg-[#f6f5f9] transition-colors"
							data-testid="notifications-button"
							type="button"
						>
							<BellIcon className="size-5 text-[#636170]" />
							<span className="absolute top-0 right-0 size-2 bg-[#ff4949] rounded-full" />
						</button>
						<div className="size-10 rounded-full bg-[#369e94] flex items-center justify-center text-white font-medium text-[14px]">
							{getInitials()}
						</div>
					</div>
				</div>

				<ProjectSettingsLayout activeTab={activeTab} project={project}>
					{renderSettingsContent()}
				</ProjectSettingsLayout>
			</div>
		</div>
	);
}
