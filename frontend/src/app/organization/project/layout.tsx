import type { ReactNode } from "react";
import { NotificationContainer } from "@/components/app/feedback/notification-container";
import SharedLayout from "@/components/layout/shared-layout";

import { SWRProvider } from "@/components/providers/swr-provider";

export default function ProjectLayout({ children }: { children: ReactNode }) {
	return (
		<SharedLayout>
			<SWRProvider>
				<div className="flex h-screen justify-center">
					<div className="flex-1 w-full h-full overflow-hidden">{children}</div>
					<NotificationContainer />
				</div>
			</SWRProvider>
		</SharedLayout>
	);
}
