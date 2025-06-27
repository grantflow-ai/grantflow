"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { UserRole } from "@/types/user";

interface ProjectSettingsLayoutProps {
	children: React.ReactNode;
	projectId: string;
	userRole?: UserRole;
}

export function ProjectSettingsLayout({ children, projectId, userRole = UserRole.MEMBER }: ProjectSettingsLayoutProps) {
	const pathname = usePathname();

	// Define all tabs
	const allTabs = [
		{ href: `/projects/${projectId}/settings/account`, label: "Account Settings" },
		{
			href: `/projects/${projectId}/settings/billing`,
			label: "Billing & Payments",
			requiresRole: [UserRole.OWNER, UserRole.ADMIN],
		},
		{
			href: `/projects/${projectId}/settings/members`,
			label: "Members",
			requiresRole: [UserRole.OWNER, UserRole.ADMIN],
		},
		{ href: `/projects/${projectId}/settings/notifications`, label: "Notifications" },
	];

	// Filter tabs based on user role
	const tabs = allTabs.filter((tab) => {
		if (!tab.requiresRole) return true;
		return tab.requiresRole.includes(userRole);
	});

	return (
		<div className="flex size-full flex-col items-start">
			<div className="flex size-full flex-col items-start justify-start px-10 py-14 gap-14">
				{/* Header */}
				<div className="flex w-full flex-col gap-8">
					<h1 className="font-['Cabin'] font-medium text-[36px] leading-[42px] text-[#2e2d36]">Settings</h1>

					{/* Tabs */}
					<div className="flex items-center gap-6">
						{tabs.map((tab) => (
							<Link
								className={cn(
									"relative px-2 py-3 text-[16px] font-['Source_Sans_Pro'] text-[#2e2d36] transition-all",
									pathname === tab.href
										? "font-['Cabin'] font-semibold border-b-[3px] border-[#1e13f8]"
										: "hover:text-[#636170]",
								)}
								href={tab.href}
								key={tab.href}
							>
								{tab.label}
							</Link>
						))}
					</div>
				</div>

				{/* Content */}
				<div className="w-full">{children}</div>
			</div>
		</div>
	);
}
