"use client";
import { Button } from "gen/ui/button";
import { MoonStar, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
	const { setTheme, theme } = useTheme();

	return (
		<Button
			data-testid="theme-toggle-button"
			variant="ghost"
			size="icon"
			onClick={() => {
				setTheme(theme === "light" ? "dark" : "light");
			}}
		>
			<Sun data-testid="theme-toggle-sun-icon" className="h-[1.5rem] w-[1.3rem] dark:hidden" />
			<MoonStar data-testid="theme-toggle-moon-icon" className="hidden h-5 w-5 dark:block" />
			<span data-testid="theme-toggle-sr-text" className="sr-only">
				Toggle theme
			</span>
		</Button>
	);
}
