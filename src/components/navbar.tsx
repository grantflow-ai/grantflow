"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "gen/cn";
import { usePathname } from "next/navigation";
import { titleize } from "inflection";

export function Navbar() {
	const pathname = usePathname();
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
				<span className="text-sm p-2">{titleize(pathname.split("/").at(-1) ?? "")}</span>
				<ThemeToggle data-testid="navbar-theme-toggle" />
			</div>
		</nav>
	);
}
