"use client";

import dynamic from "next/dynamic";
import { MockAPIInitializer } from "@/dev-tools/components/mock-api-initializer";

const DevMenu = dynamic(() => import("@/dev-tools").then((mod) => mod.DevMenu), {
	ssr: false,
});

export function DevMenuWrapper() {
	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	return (
		<>
			<MockAPIInitializer />
			<DevMenu />
		</>
	);
}
