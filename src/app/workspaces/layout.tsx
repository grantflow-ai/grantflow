import Sidebar from "@/components/sidebar";
import { ReactNode } from "react";

export default function WorkspaceListLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex h-screen" data-testid="workspaces-layout">
			<Sidebar />
			{children}
		</div>
	);
}
