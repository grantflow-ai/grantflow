"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NotificationContainer } from "@/components/app/feedback/notification-container";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function ProjectLayoutClient({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const isWizardRoute = pathname.includes("/wizard");

	return (
		<SidebarProvider defaultOpen={false}>
			<AppSidebar hidden={isWizardRoute} />
			<SidebarInset className={isWizardRoute ? "h-screen ml-0" : "h-screen"}>
				<div className="flex h-screen justify-center bg-preview-bg">
					<div className="flex-1 w-full h-full overflow-hidden bg-preview-bg">{children}</div>
					<NotificationContainer />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
