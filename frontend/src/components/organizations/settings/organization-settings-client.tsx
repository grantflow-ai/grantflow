"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import type { UserRole } from "@/types/user";
import { routes } from "@/utils/navigation";
import { generateBackgroundColor, generateInitials } from "@/utils/user";
import { OrganizationSettingsAccount } from "./organization-settings-account";
import { OrganizationSettingsLayout } from "./organization-settings-layout";
import { OrganizationSettingsMembers } from "./organization-settings-members";
import { OrganizationSettingsNotifications } from "./organization-settings-notifications";

interface OrganizationSettingsClientProps {
	activeTab: "account" | "billing" | "members" | "notifications";
}

export function OrganizationSettingsClient({ activeTab }: OrganizationSettingsClientProps) {
	const router = useRouter();
	const { project } = useProjectStore();
	const { selectedOrganizationId } = useOrganizationStore();
	const [inviteHandler, setInviteHandler] = useState<(() => void) | undefined>();

	// Redirect if no project context
	useEffect(() => {
		if (!project) {
			router.replace(routes.projects());
		}
	}, [project, router]);

	// Check role for restricted pages - only OWNER and ADMIN can access billing and members
	useEffect(() => {
		if (project && project.role === "COLLABORATOR" && (activeTab === "billing" || activeTab === "members")) {
			router.replace(routes.organization.settings.account());
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
				return (
					<OrganizationSettingsAccount
						organizationId={selectedOrganizationId!}
						userRole={project.role as UserRole}
					/>
				);
			}
			case "billing": {
				return (
					<div
						className="flex items-center justify-center h-full"
						data-testid="organization-billing-settings"
					>
						<p className="text-app-gray-600">Billing settings coming soon...</p>
					</div>
				);
			}
			case "members": {
				return selectedOrganizationId ? (
					<OrganizationSettingsMembers
						currentUserRole={project.role as UserRole}
						onInviteHandlerChange={setInviteHandler}
						organizationId={selectedOrganizationId}
					/>
				) : null;
			}
			case "notifications": {
				return <OrganizationSettingsNotifications organizationId={selectedOrganizationId!} />;
			}
		}
	};

	return (
		<div
			className="relative size-full overflow-y-scroll bg-preview-bg"
			data-testid="organization-settings-container"
		>
			<section className="w-full h-full">
				<main className="w-full h-full flex flex-col">
					<AppHeader data-testid="organization-settings-header" projectTeamMembers={projectTeamMembers} />

					<main
						className="mx-6 mb-6 px-10 relative flex flex-col gap-10 py-14 flex-grow rounded-lg border border-app-gray-100 min-h-0"
						data-testid="organization-settings-main-content"
					>
						<OrganizationSettingsLayout
							activeTab={activeTab}
							onInviteClick={inviteHandler}
							project={project}
						>
							{renderSettingsContent()}
						</OrganizationSettingsLayout>
					</main>
				</main>
			</section>
		</div>
	);
}
