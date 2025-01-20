"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { utils } from "@/lib/utils";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

const namespaces = new Set(["applications", "new", "sign-in", "workspaces"]);

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
			className={utils(
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

function parsePathComponents(path: string) {
	const components = path.split("/").filter(Boolean);
	const breadcrumbs: { href: string; label: string }[] = [];

	let currentPath = "";

	for (const component of components) {
		currentPath += `/${component}`;

		if (namespaces.has(component)) {
			breadcrumbs.push({ href: currentPath, label: component.charAt(0).toUpperCase() + component.slice(1) });
		} else if (breadcrumbs.at(-1)?.label === "Workspaces") {
			breadcrumbs.push({ href: currentPath, label: "Workspace Details" });
		} else if (breadcrumbs.at(-1)?.label === "Applications") {
			breadcrumbs.push({ href: currentPath, label: "Application Details" });
		}
	}

	return breadcrumbs;
}
