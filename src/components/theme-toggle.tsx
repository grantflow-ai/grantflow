"use client";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { Button } from "gen/ui/button";
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
			<Button variant="outline" size="sm" className="dark:hidden bg-inherit ">
				<SunIcon data-testid="theme-toggle-sun-icon" className="h-5 w-5" />
			</Button>
			<Button variant="outline" size="sm" className="hidden dark:block bg-inherit border-slate-700">
				<MoonIcon data-testid="theme-toggle-moon-icon" className="h-5 w-5" />
			</Button>
			<span data-testid="theme-toggle-sr-text" className="sr-only">
				Toggle theme
			</span>
		</Button>
	);
}
