"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { API } from "@/types/api-types";
import { UserRole } from "@/types/user";
import { routes } from "@/utils/navigation";

interface ProjectSettingsLayoutProps {
	activeTab: string;
	children: React.ReactNode;
	project: API.GetProject.Http200.ResponseBody;
}

export function ProjectSettingsLayout({ activeTab, children, project }: ProjectSettingsLayoutProps) {
	const userRole = project.role as UserRole;

	const allTabs = [
		{
			href: routes.project.settings.account(),
			key: "account",
			label: "Account Settings",
		},
		{
			href: routes.project.settings.billing(),
			key: "billing",
			label: "Billing & Payments",
			requiresRole: [UserRole.OWNER, UserRole.ADMIN],
		},
		{
			href: routes.project.settings.members(),
			key: "members",
			label: "Members",
			requiresRole: [UserRole.OWNER, UserRole.ADMIN],
		},
		{
			href: routes.project.settings.notifications(),
			key: "notifications",
			label: "Notifications",
		},
	];

	const tabs = allTabs.filter((tab) => {
		if (!tab.requiresRole) return true;
		return tab.requiresRole.includes(userRole);
	});

	return (
		<div className="flex size-full flex-col items-start">
			<div className="flex size-full flex-col items-start justify-start px-10 py-14 gap-14">
				<div className="flex w-full flex-col gap-8">
					<h1 className="font-medium text-[36px] leading-[42px] text-text-primary font-heading">Settings</h1>

					<div className="flex items-center gap-6">
						{tabs.map((tab) => (
							<Link
								className={cn(
									"relative px-2 py-3 text-[16px] text-text-primary transition-all font-body",
									activeTab === tab.key
										? "font-semibold border-b-[3px] border-primary font-heading"
										: "hover:text-text-secondary",
								)}
								data-testid={`settings-tab-${tab.key}`}
								href={tab.href}
								key={tab.href}
							>
								{tab.label}
							</Link>
						))}
					</div>
				</div>

				<div className="w-full">{children}</div>
			</div>
		</div>
	);
}
