"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "gen/cn";
import { usePathname } from "next/navigation";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "gen/ui/breadcrumb";
import { Fragment } from "react";

const namespaces = new Set(["applications", "workspaces", "sign-in", "new"]);

function parsePathComponents(path: string) {
	const components = path.split("/").filter(Boolean);
	const breadcrumbs: { label: string; href: string }[] = [];

	let currentPath = "";

	for (const component of components) {
		currentPath += `/${component}`;

		if (namespaces.has(component)) {
			breadcrumbs.push({ label: component.charAt(0).toUpperCase() + component.slice(1), href: currentPath });
		} else if (breadcrumbs.at(-1)?.label === "Workspaces") {
			breadcrumbs.push({ label: "Workspace Details", href: currentPath });
		} else if (breadcrumbs.at(-1)?.label === "Applications") {
			breadcrumbs.push({ label: "Application Details", href: currentPath });
		}
	}

	return breadcrumbs;
}

export function Breadcrumbs({ pathname }: { pathname: string }) {
	const breadcrumbs = parsePathComponents(pathname);
	const currentPage = breadcrumbs.pop()!;

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{breadcrumbs.map((crumb) => (
					<Fragment key={crumb.href}>
						<BreadcrumbItem>
							<BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
					</Fragment>
				))}
				<BreadcrumbItem>
					<BreadcrumbPage>{currentPage.label}</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}

export function Navbar() {
	const pathname = usePathname();

	return (
		<nav
			className={cn(
				"w-full",
				"border-b border-gray-200 dark:border-gray-700",
				"bg-white dark:bg-secondary",
				"transition-all duration-200",
			)}
			data-testid="navbar"
		>
			<div className="flex justify-between items-center h-16 w-full container px-4" data-testid="navbar-actions">
				<Breadcrumbs pathname={pathname} />
				<ThemeToggle data-testid="navbar-theme-toggle" />
			</div>
		</nav>
	);
}
