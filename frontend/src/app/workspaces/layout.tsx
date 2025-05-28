import { ReactNode } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
	return (
		<div className="bg-white flex justify-center">
			<div className="grow">{children}</div>
		</div>
	);
}
