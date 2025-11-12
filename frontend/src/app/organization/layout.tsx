"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NotificationContainer } from "@/components/app/feedback/notification-container";
import SharedLayout from "@/components/layout/shared-layout";
import { AppSidebar } from "@/components/sidebar/app-sidebar";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SWRProvider } from "@/providers/swr-provider";

export default function ProjectLayout({ children }: { children: ReactNode }) {
	return (
		<SharedLayout>
			<SWRProvider>
				<ProjectLayoutClient>{children}</ProjectLayoutClient>
			</SWRProvider>
		</SharedLayout>
	);
}

function ProjectLayoutClient({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const isWizardRoute = pathname.includes("/wizard") || pathname.includes("/new");
	const isGrantingInstitutionDetailOrEditPage = pathname.startsWith("/organization/admin/granting-institutions/") && !pathname.endsWith("/new");

	return (
		<SidebarProvider defaultOpen={false}>
			<AppSidebar hidden={isWizardRoute || isGrantingInstitutionDetailOrEditPage} />
			<SidebarInset className={isWizardRoute || isGrantingInstitutionDetailOrEditPage ? "h-screen ml-0" : "h-screen"}>
				<div className="flex h-screen justify-center bg-preview-bg">
					<div className="flex-1 w-full h-full overflow-hidden bg-preview-bg">{children}</div>
					<NotificationContainer />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
