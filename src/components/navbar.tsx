"use client";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { PagePath } from "@/config/enums";
import { getNavItems } from "@/config/navigation";
import { cn } from "gen/cn";
import { buttonVariants } from "gen/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
	const pathName = usePathname();
	const { items, links } = getNavItems(pathName as PagePath);

	return (
		<nav className="container flex h-16 items-center sm:justify-between sm:space-x-0" data-testid="navbar">
			<Logo data-testid="navbar-logo" />
			<div className="flex gap-6 md:gap-10" data-testid="navbar-items">
				{items.map(
					(item) =>
						item.href && (
							<Link
								key={item.title}
								href={item.href}
								className={cn(
									"flex items-center text-sm font-medium text-muted-foreground",
									item.disabled && "cursor-not-allowed opacity-80",
								)}
								data-testid={`navbar-item-${item.title.toLowerCase().replaceAll(/\s+/g, "-")}`}
							>
								{item.title}
							</Link>
						),
				)}
			</div>
			<div className="flex flex-1 gap-6 items-center justify-end" data-testid="navbar-actions">
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
				<ThemeToggle data-testid="navbar-theme-toggle" />
			</div>
		</nav>
	);
}
