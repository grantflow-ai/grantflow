"use client";

import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
	return (
		<nav className="fixed top-0 right-0 left-10 h-10 bg-brand border-b" data-testid="navbar">
			<div className="flex flex-1 gap-5 items-center justify-end" data-testid="navbar-actions">
				<ThemeToggle data-testid="navbar-theme-toggle" />
			</div>
		</nav>
	);
}
