import { Navbar } from "@/components/navbar";
import { ReactNode } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex flex-col justify-center min-h-screen bg-background">
			<Navbar />
			<div className="flex-grow">{children}</div>
		</div>
	);
}
