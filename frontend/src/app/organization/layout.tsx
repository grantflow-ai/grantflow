import type { ReactNode } from "react";
import SharedLayout from "@/components/layout/shared-layout";
import { SWRProvider } from "@/components/providers/swr-provider";
import { ProjectLayoutClient } from "./project-layout-client";

export default function ProjectLayout({ children }: { children: ReactNode }) {
	return (
		<SharedLayout>
			<SWRProvider>
				<ProjectLayoutClient>{children}</ProjectLayoutClient>
			</SWRProvider>
		</SharedLayout>
	);
}
