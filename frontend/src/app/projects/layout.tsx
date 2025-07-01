import type { ReactNode } from "react";
import { NotificationContainer } from "@/components/app/feedback/notification-container";
import SharedLayout from "@/components/layout/shared-layout";

import { SWRProvider } from "@/components/providers/swr-provider";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";


export default function ProjectLayout({ children }: { children: ReactNode }) {
	return (
		<SharedLayout>
			<SWRProvider>
				{/* <div className="flex h-full bg-[#faf9fb]">
					<div className="flex h-full w-16 flex-col  items-center bg-[#faf9fb] border-r border-[#e1dfeb]">

					<Sidebar />
					</div>
					<div className="flex flex-1 justify-center bg-[#faf9fb]">
						<div className="grow">{children}</div>
					</div>
					<NotificationContainer />
				</div> */}
				<SidebarProvider>
					<AppSidebar />
					<SidebarInset>
						
						<div className="flex justify-center bg-[#faf9fb]">
						<div className="w-full">{children}</div>
					</div>
					</SidebarInset>
				</SidebarProvider>
			</SWRProvider>
		</SharedLayout>
	);
}
