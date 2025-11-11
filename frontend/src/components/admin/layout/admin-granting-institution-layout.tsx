"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { routes } from "@/utils/navigation";

interface AdminGrantingInstitutionLayoutProps {
	activeTab: "edit" | "predefined-templates" | "sources";
	children: React.ReactNode;
}

export function AdminGrantingInstitutionLayout({ activeTab, children }: AdminGrantingInstitutionLayoutProps) {
	const tabs = [
		{
			href: routes.admin.grantingInstitutions.sources(),
			key: "sources",
			label: "Sources",
		},
		{
			href: routes.admin.grantingInstitutions.predefinedTemplates.list(),
			key: "predefined-templates",
			label: "Predefined Templates",
		},
		{
			href: routes.admin.grantingInstitutions.edit(),
			key: "edit",
			label: "Edit",
		},
	];

	return (
		<div className="flex flex-col gap-8 font-cabin" data-testid="admin-granting-institution-layout">
			<div className="flex w-full flex-col gap-8">
				<div className="flex items-center justify-between w-full">
					<div className="flex items-center gap-6" data-testid="admin-granting-institution-tabs">
						{tabs.map((tab) => (
							<Link
								className={cn(
									"relative px-2 py-3 text-base font-cabin text-app-black",
									activeTab === tab.key
										? "font-semibold border-b-[3px] border-primary"
										: "font-light hover:text-app-gray-600",
								)}
								data-testid={`admin-granting-institution-tab-${tab.key}`}
								href={tab.href}
								key={tab.href}
							>
								{tab.label}
							</Link>
						))}
					</div>
				</div>
			</div>

			<div className="w-full" data-testid="admin-granting-institution-content">
				{children}
			</div>
		</div>
	);
}
