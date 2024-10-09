"use client";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { PagePath } from "@/enums";
import { getEnv } from "@/utils/env";
import { getBrowserClient } from "@/utils/supabase/client";
import { EnterIcon, ExitIcon, HomeIcon } from "@radix-ui/react-icons";
import { Button } from "gen/ui/button";
import { usePathname, useRouter } from "next/navigation";
import type { SupportedLocale } from "@/i18n";

export function Navbar({ isSignedIn, locale }: { isSignedIn: boolean; locale: SupportedLocale }) {
	const pathname = usePathname();
	const router = useRouter();
	const client = getBrowserClient();
	const isRoot = ["/", `/${locale}`].includes(pathname);

	const handleSignInClick = async () => {
		if (isSignedIn) {
			await client.auth.signOut();
			router.push(PagePath.ROOT);
		} else {
			router.push(PagePath.AUTH);
		}
	};

	const handleHomeClick = () => {
		router.push(PagePath.ROOT);
	};

	return (
		<nav className="px-4 border-2 flex h-14 items-center justify-between sm:space-x-0 w-full" data-testid="navbar">
			<div
				className="bg-slate-100 dark:bg-slate-800 hover:dark:bg-slate-600/50 hover:bg-slate-200/70 dark:border-slate-700 light:border-slate-200 cursor-pointer rounded-lg p-1"
				onClick={handleHomeClick}
				onKeyDown={handleHomeClick}
				data-testid="navbar-logo-container"
			>
				<Logo data-testid="navbar-logo" />
			</div>
			<div className="flex flex-1 gap-5 items-center justify-end" data-testid="navbar-actions">
				<div className="flex gap-3">
					{!isRoot && (
						<Button variant="outline" size="sm" className="bg-inherit dark:border-slate-700">
							<HomeIcon />
						</Button>
					)}
					{getEnv().NEXT_PUBLIC_IS_DEVELOPMENT && (
						<Button
							variant="outline"
							size="sm"
							className="bg-inherit dark:border-slate-700"
							onClick={handleSignInClick}
							onKeyDown={handleSignInClick}
						>
							{isSignedIn ? <ExitIcon /> : <EnterIcon />}
						</Button>
					)}
				</div>
				<ThemeToggle data-testid="navbar-theme-toggle" />
			</div>
		</nav>
	);
}
