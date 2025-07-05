"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function CustomSidebarTrigger(props: React.HTMLAttributes<HTMLButtonElement>) {
	const { state, toggleSidebar } = useSidebar();

	return (
		<Button
			onClick={toggleSidebar}
			size="icon"
			variant="ghost"
			{...props}
			className="h-8 w-8 cursor-pointer hover:bg-transparent hover:text-black  "
		>
			{state === "expanded" ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
			<span className="sr-only">Toggle Sidebar</span>
		</Button>
	);
}
