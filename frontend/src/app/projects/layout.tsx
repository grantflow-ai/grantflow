import type { ReactNode } from "react";
import { NotificationContainer } from "@/components/app/feedback/notification-container";
import SharedLayout from "@/components/layout/shared-layout";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SWRProvider } from "@/components/providers/swr-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function ProjectLayout({ children }: { children: ReactNode }) {
	return (
		<SharedLayout>
			<SWRProvider>
				<SidebarProvider>
					<AppSidebar />
					<SidebarInset className="h-screen">
						<div className="flex h-screen justify-center bg-[#faf9fb]">
							<div className="flex-1 w-full h-full overflow-hidden">{children}</div>
							<NotificationContainer />
						</div>
					</SidebarInset>
				</SidebarProvider>
			</SWRProvider>
		</SharedLayout>
	);
}
