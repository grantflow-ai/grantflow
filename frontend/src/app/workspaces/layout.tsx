import SharedLayout from "@/components/shared-layout";

import type { ReactNode } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
	return (
		<SharedLayout>
			<div className="flex justify-center bg-white">
				<div className="grow">{children}</div>
			</div>
		</SharedLayout>
	);
}
