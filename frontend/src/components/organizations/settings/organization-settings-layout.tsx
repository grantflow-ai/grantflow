"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/user";
import { routes } from "@/utils/navigation";

interface OrganizationSettingsLayoutProps {
	activeTab: string;
	children: React.ReactNode;
	onInviteClick?: () => void;
	userRole: UserRole;
}

export function OrganizationSettingsLayout({
	activeTab,
	children,
	onInviteClick,
	userRole,
}: OrganizationSettingsLayoutProps) {
	const allTabs = [
		{
			href: routes.organization.settings.account(),
			key: "account",
			label: "Organisation Settings",
			requiresRole: [UserRole.OWNER, UserRole.ADMIN]
		},
		{
			href: routes.organization.settings.billing(),
			key: "billing",
			label: "Billing & Payments",
			requiresRole: [UserRole.OWNER, UserRole.ADMIN],
		},
		{
			href: routes.organization.settings.members(),
			key: "members",
			label: "Members",
			requiresRole: [UserRole.OWNER, UserRole.ADMIN],
		},
		{
			href: routes.organization.settings.personal(),
			key: "personal",
			label: "Personal Settings",
		},
		{
			href: routes.organization.settings.notifications(),
			key: "notifications",
			label: "Notifications",
		},
	];

	const tabs = allTabs.filter((tab) => {
		if (!tab.requiresRole) return true;
		return tab.requiresRole.includes(userRole);
	});

	return (
		<div className="flex flex-col gap-8 font-cabin">
			<div className="flex w-full flex-col gap-8">
				<h1 className="font-medium text-[36px] leading-[42px] text-app-black">Settings</h1>

				<div className="flex items-center justify-between w-full">
					<div className="flex items-center gap-6">
						{tabs.map((tab) => (
							<Link
								className={cn(
									"relative px-2 py-3 text-[16px] transition-all",
									activeTab === tab.key
										? "font-semibold text-app-black border-b-[3px] border-primary"
										: "font-body text-app-black hover:text-app-gray-600",
								)}
								data-testid={`organization-settings-tab-${tab.key}`}
								href={tab.href}
								key={tab.href}
							>
								{tab.label}
							</Link>
						))}
					</div>

					{activeTab === "members" &&
						onInviteClick &&
						(userRole === UserRole.OWNER || userRole === UserRole.ADMIN) && (
							<button
								className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded font-button text-[16px] hover:bg-primary/90 transition-colors"
								onClick={onInviteClick}
								type="button"
							>
								<Plus className="size-4" />
								Invite
							</button>
						)}
				</div>
			</div>

			<div className="w-full">{children}</div>
		</div>
	);
}
