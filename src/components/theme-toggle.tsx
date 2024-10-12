"use client";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { Button } from "gen/ui/button";
import { useTheme } from "next-themes";

export function ThemeToggle() {
	const { setTheme, theme } = useTheme();

	return (
		<Button
			data-testid="theme-toggle-button"
			variant="outline"
			size="sm"
			className="bg-inherit dark:border-slate-700"
			onClick={() => {
				setTheme(theme === "light" ? "dark" : "light");
			}}
		>
			<SunIcon data-testid="theme-toggle-sun-icon" className="dark:hidden h-3.5 w-3.5" />
			<MoonIcon data-testid="theme-toggle-moon-icon" className="hidden dark:block bg-inherit h-3.5 w-3.5" />
			<span data-testid="theme-toggle-sr-text" className="sr-only">
				Toggle theme
			</span>
		</Button>
	);
}
