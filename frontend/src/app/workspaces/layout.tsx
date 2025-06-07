import { ReactNode } from "react";

import SharedLayout from "@/components/shared-layout";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
	return (
		<SharedLayout>
			<div className="flex justify-center bg-white">
				<div className="grow">{children}</div>
			</div>
		</SharedLayout>
	);
}
