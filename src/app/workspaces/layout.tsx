import Sidebar from "@/components/sidebar";
import { ReactNode } from "react";
import { Navbar } from "@/components/navbar";

export default function WorkspacesLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex h-screen" data-testid="workspaces-layout">
			<Sidebar />
			<div className="flex flex-col flex-1 ml-14">
				<Navbar />
				<div className="mt-14 p-4">{children}</div>
			</div>
		</div>
	);
}
