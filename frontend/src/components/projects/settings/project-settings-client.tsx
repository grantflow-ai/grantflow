"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { ProjectSettingsAccount, ProjectSettingsMembers } from "@/components/projects";
import { useProjectStore } from "@/stores/project-store";
import type { UserRole } from "@/types/user";
import { routes } from "@/utils/navigation";
import { generateBackgroundColor, generateInitials } from "@/utils/user";
import { ProjectSettingsLayout } from "./project-settings-layout";
import { ProjectSettingsNotifications } from "./project-settings-notifications";

interface ProjectSettingsClientProps {
	activeTab: "account" | "billing" | "members" | "notifications";
}

export function ProjectSettingsClient({ activeTab }: ProjectSettingsClientProps) {
	const router = useRouter();
	const { project } = useProjectStore();
	const [inviteHandler, setInviteHandler] = useState<(() => void) | undefined>();

	// Redirect if no project context
	useEffect(() => {
		if (!project) {
			router.replace(routes.projects());
		}
	}, [project, router]);

	// Check role for restricted pages - only OWNER and ADMIN can access billing and members
	useEffect(() => {
		if (project && project.role === "MEMBER" && (activeTab === "billing" || activeTab === "members")) {
			router.replace(routes.project.settings.account());
		}
	}, [project, activeTab, router]);

	if (!project) {
		return null; // Will redirect
	}

	// Generate team members for AppHeader (similar to dashboard)
	const projectTeamMembers = project.members.map((member) => ({
		backgroundColor: generateBackgroundColor(member.firebase_uid),
		initials: generateInitials(member.display_name ?? undefined, member.email),
		...(member.photo_url && { imageUrl: member.photo_url }),
	}));

	const renderSettingsContent = () => {
		switch (activeTab) {
			case "account": {
				return <ProjectSettingsAccount projectId={project.id} userRole={project.role as UserRole} />;
			}
			case "billing": {
				return (
					<div className="flex items-center justify-center h-full" data-testid="billing-settings">
						<p className="text-app-gray-600">Billing settings coming soon...</p>
					</div>
				);
			}
			case "members": {
				return (
					<ProjectSettingsMembers
						currentUserRole={project.role as UserRole}
						onInviteHandlerChange={setInviteHandler}
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
		<div className="relative size-full overflow-y-scroll bg-preview-bg" data-testid="settings-container">
			<section className="w-full h-full">
				<main className="w-full h-full flex flex-col">
					<AppHeader data-testid="settings-header" projectTeamMembers={projectTeamMembers} />

					<main
						className="mx-6 mb-6 px-10 relative flex flex-col gap-10 py-14 rounded-lg bg-white border border-app-gray-100 min-h-0"
						data-testid="settings-main-content"
					>
						<ProjectSettingsLayout activeTab={activeTab} onInviteClick={inviteHandler} project={project}>
							{renderSettingsContent()}
						</ProjectSettingsLayout>
					</main>
				</main>
			</section>
		</div>
	);
}
