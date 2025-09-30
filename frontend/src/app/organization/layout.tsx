"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NotificationContainer } from "@/components/app/feedback/notification-container";
import SharedLayout from "@/components/layout/shared-layout";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SupportModal } from "@/components/support/support-modal";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SWRProvider } from "@/providers/swr-provider";
import { useSupportModalStore } from "@/stores/support-modal-store";

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
	const isWizardRoute = pathname.includes("/wizard");
	const { closeModal, isOpen } = useSupportModalStore();

	return (
		<SidebarProvider defaultOpen={false}>
			<AppSidebar hidden={isWizardRoute} />
			<SidebarInset className={isWizardRoute ? "h-screen ml-0" : "h-screen"}>
				<div className="flex h-screen justify-center bg-preview-bg">
					<div className="flex-1 w-full h-full overflow-hidden bg-preview-bg">{children}</div>
					<NotificationContainer />
				</div>
				<SupportModal isOpen={isOpen} onClose={closeModal} />
			</SidebarInset>
		</SidebarProvider>
	);
}
