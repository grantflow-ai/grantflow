"use client";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getNavItems } from "@/config/navigation";
import { PagePath } from "@/enums";
import { getEnv } from "@/utils/env";
import { getBrowserClient } from "@/utils/supabase/client";
import { EnterIcon, ExitIcon } from "@radix-ui/react-icons";
import { cn } from "gen/cn";
import { Button, buttonVariants } from "gen/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function Navbar({ isSignedIn }: { isSignedIn: boolean }) {
	const pathName = usePathname();
	const router = useRouter();
	const { items, links } = getNavItems(pathName as PagePath);

	const client = getBrowserClient();

	return (
		<nav
			className="px-6 bg-muted flex h-16 items-center sm:justify-between sm:space-x-0 w-full gap-5"
			data-testid="navbar"
		>
			<Logo data-testid="navbar-logo" />
			<div className="flex gap-6 md:gap-10" data-testid="navbar-items">
				{items.map(
					(item) =>
						item.href && (
							<Link
								key={item.title}
								href={item.href}
								className={cn(
									"flex items-center font-medium text-muted-foreground",
									item.disabled && "cursor-not-allowed opacity-80",
								)}
								data-testid={`navbar-item-${item.title.toLowerCase().replaceAll(/\s+/g, "-")}`}
							>
								{item.title}
							</Link>
						),
				)}
			</div>
			<div className="flex flex-1 gap-3 items-center justify-end" data-testid="navbar-actions">
				{links.length ? (
					<div className="flex gap-2" data-testid="navbar-links">
						{links.map((link) => (
							<Link
								key={link.name}
								href={link.href}
								target="_blank"
								rel="noreferrer"
								data-testid={`navbar-link-${link.name.toLowerCase().replaceAll(/\s+/g, "-")}`}
							>
								<div
									className={buttonVariants({
										size: "icon",
										variant: "ghost",
									})}
								>
									<link.icon className="h-5 w-5" />
									<span className="sr-only">{link.name}</span>
								</div>
							</Link>
						))}
					</div>
				) : null}
				{getEnv().NEXT_PUBLIC_IS_DEVELOPMENT && (
					<Button
						variant="outline"
						size="sm"
						className="bg-inherit dark:border-slate-700"
						onClick={async () => {
							if (isSignedIn) {
								await client.auth.signOut();
								router.push(PagePath.ROOT);
							} else {
								router.push(PagePath.AUTH);
							}
						}}
					>
						{isSignedIn ? <ExitIcon className="h-5 w-5" /> : <EnterIcon className="h-5 w-5" />}
					</Button>
				)}
				<ThemeToggle data-testid="navbar-theme-toggle" />
			</div>
		</nav>
	);
}
