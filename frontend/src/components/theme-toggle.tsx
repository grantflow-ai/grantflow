"use client";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

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
			<SunIcon className="dark:hidden h-4 w-4" data-testid="theme-toggle-sun-icon" />
			<MoonIcon className="hidden dark:block bg-inherit h-4 w-4" data-testid="theme-toggle-moon-icon" />
			<span className="sr-only" data-testid="theme-toggle-sr-text">
				Toggle theme
			</span>
		</Button>
	);
}
