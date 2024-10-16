"use client";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ApiPath, PagePath } from "@/enums";
import { getEnv } from "@/utils/env";
import { EnterIcon, ExitIcon, HomeIcon } from "@radix-ui/react-icons";
import { Button } from "gen/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function Navbar() {
	const router = useRouter();
	const { data: session } = useSession();

	const isSignedIn = !!session?.user;

	return (
		<nav
			className="flex h-12 items-center justify-between py-2 px-5 bg-dash-sidebar border-b border-default"
			data-testid="navbar"
		>
			<Button
				variant="outline"
				className="hover:dark:bg-slate-600/50 hover:bg-slate-200/70 dark:border-slate-700 light:border-slate-200 cursor-pointer rounded-lg p-1"
				data-testid="navbar-logo-container"
				onClick={() => {
					router.push(PagePath.ROOT);
				}}
			>
				<Logo data-testid="navbar-logo" />
			</Button>
			<div className="flex flex-1 gap-5 items-center justify-end" data-testid="navbar-actions">
				<div className="flex gap-3">
					{isSignedIn && (
						<Button
							variant="outline"
							size="sm"
							className="bg-inherit dark:border-slate-700"
							onClick={() => {
								router.push(PagePath.WORKSPACES);
							}}
						>
							<HomeIcon className="h-3.5 w-3.5" />
						</Button>
					)}
					{getEnv().NEXT_PUBLIC_IS_DEVELOPMENT && (
						<Button
							variant="outline"
							size="sm"
							className="bg-inherit dark:border-slate-700"
							onClick={() => {
								router.push(isSignedIn ? ApiPath.LOGOUT : PagePath.SIGNIN);
							}}
						>
							{isSignedIn ? <ExitIcon className="h-3.5 w-3.5" /> : <EnterIcon className="h-3.5 w-3.5" />}
						</Button>
					)}
				</div>
				<ThemeToggle data-testid="navbar-theme-toggle" />
			</div>
		</nav>
	);
}
