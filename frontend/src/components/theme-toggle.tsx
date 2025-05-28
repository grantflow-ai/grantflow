"use client";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const { setTheme, theme } = useTheme();

	return (
		<Button
			className="dark:hover:bg-primary/20"
			data-testid="theme-toggle-button"
			onClick={() => {
				setTheme(theme === "light" ? "dark" : "light");
			}}
			variant="ghost"
		>
			<SunIcon className="size-4 dark:hidden" data-testid="theme-toggle-sun-icon" />
			<MoonIcon className="hidden size-4 bg-inherit dark:block" data-testid="theme-toggle-moon-icon" />
			<span className="sr-only" data-testid="theme-toggle-sr-text">
				Toggle theme
			</span>
		</Button>
	);
}
