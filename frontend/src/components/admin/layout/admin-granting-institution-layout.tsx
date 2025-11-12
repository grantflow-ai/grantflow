"use client";

import Link from "next/link";
import { GRANTING_INSTITUTION_TABS, type GrantingInstitutionTab } from "@/constants/admin";
import { cn } from "@/lib/utils";

interface AdminGrantingInstitutionLayoutProps {
	activeTab: GrantingInstitutionTab;
	children: React.ReactNode;
}

export function AdminGrantingInstitutionLayout({ activeTab, children }: AdminGrantingInstitutionLayoutProps) {
	return (
		<div className="flex flex-col flex-1 min-h-0 font-cabin" data-testid="admin-granting-institution-layout">
			<nav
				className="flex items-center gap-6 border-b-1 border-gray-100 px-4 sm:px-6 md:px-8 lg:px-10 pb-8"
				data-testid="admin-granting-institution-tabs"
			>
				{GRANTING_INSTITUTION_TABS.map((tab) => (
					<Link
						className={cn(
							"relative px-2 py-3 text-base font-cabin text-app-black",
							activeTab === tab.key
								? "font-semibold border-b-[3px] border-primary"
								: "font-light hover:text-app-gray-600",
						)}
						data-testid={`admin-granting-institution-tab-${tab.key}`}
						href={tab.href}
						key={tab.key}
					>
						{tab.label}
					</Link>
				))}
			</nav>

			<div className="flex-1 min-h-0 w-full" data-testid="admin-granting-institution-content">
				{children}
			</div>
		</div>
	);
}
