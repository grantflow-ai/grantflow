import type { ReactNode } from "react";
import { NotificationContainer } from "@/components/app/feedback/notification-container";
import SharedLayout from "@/components/layout/shared-layout";
import { Sidebar } from "@/components/layout/sidebar";
import { SWRProvider } from "@/components/providers/swr-provider";

export default function ProjectLayout({ children }: { children: ReactNode }) {
	return (
		<SharedLayout>
			<SWRProvider>
				<div className="flex h-full bg-[#faf9fb]">
					<div className="flex h-full w-16 flex-col  items-center bg-[#faf9fb] border-r border-[#e1dfeb]">

					<Sidebar />
					</div>
					<div className="flex flex-1 justify-center bg-[#faf9fb]">
						<div className="grow">{children}</div>
					</div>
					<NotificationContainer />
				</div>
			</SWRProvider>
		</SharedLayout>
	);
}
