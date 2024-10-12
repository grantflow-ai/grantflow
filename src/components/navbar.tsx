"use server";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ApiPath, PagePath } from "@/enums";
import { getEnv } from "@/utils/env";
import { EnterIcon, ExitIcon, HomeIcon } from "@radix-ui/react-icons";
import { Button } from "gen/ui/button";
import Link from "next/link";
import { getServerClient } from "@/utils/supabase/server";

export async function Navbar() {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const isSignedIn = !!user;

	return (
		<nav className="px-4 border-2 flex h-14 items-center justify-between sm:space-x-0 w-full" data-testid="navbar">
			<Link
				className="bg-slate-100 dark:bg-slate-800 hover:dark:bg-slate-600/50 hover:bg-slate-200/70 dark:border-slate-700 light:border-slate-200 cursor-pointer rounded-lg p-1"
				href={PagePath.ROOT}
				data-testid="navbar-logo-container"
			>
				<Logo data-testid="navbar-logo" />
			</Link>
			<div className="flex flex-1 gap-5 items-center justify-end" data-testid="navbar-actions">
				<div className="flex gap-3">
					{isSignedIn && (
						<Button variant="outline" size="sm" className="bg-inherit dark:border-slate-700">
							<Link href={PagePath.WORKSPACES}>
								<HomeIcon />
							</Link>
						</Button>
					)}
					{getEnv().NEXT_PUBLIC_IS_DEVELOPMENT && (
						<Button variant="outline" size="sm" className="bg-inherit dark:border-slate-700">
							<Link href={isSignedIn ? ApiPath.LOGOUT : PagePath.AUTH}>
								{isSignedIn ? <ExitIcon /> : <EnterIcon />}
							</Link>
						</Button>
					)}
				</div>
				<ThemeToggle data-testid="navbar-theme-toggle" />
			</div>
		</nav>
	);
}
