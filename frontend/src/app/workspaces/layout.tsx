import { Navbar } from "@/components/navbar";
import { ReactNode } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex flex-col min-h-screen bg-background">
			<Navbar />
			<div className="flex-grow container">{children}</div>
		</div>
	);
}
