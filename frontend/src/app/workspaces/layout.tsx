import { ReactNode } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex justify-center bg-white">
			<div className="grow">{children}</div>
		</div>
	);
}
