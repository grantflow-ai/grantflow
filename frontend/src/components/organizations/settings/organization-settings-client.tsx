"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { getOrganizationMembers } from "@/actions/organization";
import { AppHeader } from "@/components/layout/app-header";
import {
	OrganizationSettingsGeneral,
	OrganizationSettingsLayout,
	OrganizationSettingsMembers,
	OrganizationSettingsNotifications,
} from "@/components/organizations";
import { useOrganizationStore } from "@/stores/organization-store";
import type { UserRole } from "@/types/user";
import { routes } from "@/utils/navigation";
import { generateBackgroundColor, generateInitials } from "@/utils/user";

interface OrganizationSettingsClientProps {
	activeTab: "account" | "billing" | "members" | "notifications";
}

export function OrganizationSettingsClient({ activeTab }: OrganizationSettingsClientProps) {
	const router = useRouter();
	const { getOrganization, organization, selectedOrganizationId } = useOrganizationStore();
	const [inviteHandler, setInviteHandler] = useState<(() => void) | undefined>();

	// Fetch organization members
	const { data: organizationMembers = [] } = useSWR(
		selectedOrganizationId ? ["organization-members", selectedOrganizationId] : null,
		([, orgId]) => getOrganizationMembers(orgId),
		{
			revalidateOnFocus: false,
		},
	);

	// Redirect if no organization context
	useEffect(() => {
		if (!selectedOrganizationId) {
			router.replace(routes.organization.root());
		}
	}, [selectedOrganizationId, router]);

	// Check role for restricted pages - only OWNER and ADMIN can access billing and members
	useEffect(() => {
		if (
			organization &&
			organization.role === "COLLABORATOR" &&
			(activeTab === "billing" || activeTab === "members")
		) {
			router.replace(routes.organization.settings.account());
		}
	}, [organization, activeTab, router]);

	// Load organization data
	useEffect(() => {
		if (selectedOrganizationId) {
			void getOrganization(selectedOrganizationId);
		}
	}, [selectedOrganizationId, getOrganization]);

	if (!organization) {
		return null; // Will redirect
	}

	// Generate team members for AppHeader from organization members
	const projectTeamMembers = organizationMembers.map((member) => ({
		backgroundColor: generateBackgroundColor(member.firebase_uid),
		initials: generateInitials(member.display_name, member.email),
		...(member.photo_url && { imageUrl: member.photo_url }),
	}));

	const renderSettingsContent = () => {
		switch (activeTab) {
			case "account": {
				return (
					<OrganizationSettingsGeneral
						organizationId={selectedOrganizationId!}
						userRole={organization.role as UserRole}
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
						currentUserRole={organization.role as UserRole}
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
						className="mx-6 mb-6 px-10 relative flex flex-col gap-10 py-14 flex-grow rounded-lg border border-app-gray-100 min-h-0 bg-white"
						data-testid="organization-settings-main-content"
					>
						<OrganizationSettingsLayout
							activeTab={activeTab}
							onInviteClick={inviteHandler}
							userRole={organization.role as UserRole}
						>
							{renderSettingsContent()}
						</OrganizationSettingsLayout>
					</main>
				</main>
			</section>
		</div>
	);
}
