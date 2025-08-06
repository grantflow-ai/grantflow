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
			className=" w-4 h-4 cursor-pointer hover:bg-transparent hover:text-black  "
		>
			{state === "expanded" ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-2 w-2 text-gray-700" />}
			<span className="sr-only">Toggle Sidebar</span>
		</Button>
	);
}
