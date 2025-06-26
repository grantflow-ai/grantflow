import type { ReactNode } from "react";
import SharedLayout from "@/components/shared-layout";

export default function ProjectLayout({ children }: { children: ReactNode }) {
	return (
		<SharedLayout>
			<div className="flex justify-center bg-white">
				<div className="grow">{children}</div>
			</div>
		</SharedLayout>
	);
}
