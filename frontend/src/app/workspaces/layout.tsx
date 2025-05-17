import { Navbar } from "@/components/navbar";
import { ReactNode } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
	return (
		<div className="bg-background flex flex-col justify-center">
			<Navbar />
			<div className="grow">{children}</div>
		</div>
	);
}
