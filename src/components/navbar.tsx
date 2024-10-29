"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "gen/cn";
import { ReactNode } from "react";
export function Navbar({ children }: { children: ReactNode }) {
	return (
		<nav
			className={cn(
				"fixed top-0 right-0 left-14",
				"h-12 z-40",
				"border-b border-gray-200 dark:border-gray-700",
				"bg-white dark:bg-secondary",
				"transition-all duration-200",
			)}
			data-testid="navbar"
		>
			<div className="flex justify-between items-center h-full w-full p-2" data-testid="navbar-actions">
				<div className="flex items-center gap-1">{children}</div>
				<ThemeToggle data-testid="navbar-theme-toggle" />
			</div>
		</nav>
	);
}
