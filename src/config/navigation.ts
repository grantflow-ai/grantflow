import { PagePath } from "@/config/enums";
import type { NavItem, NavMapping } from "@/types/nav-types";
import { getEnv } from "@/utils/env";

const homeNavItem = {
	title: "Home",
	href: "/",
} satisfies NavItem;

const rootNavMapping = {
	items: getEnv().NEXT_PUBLIC_IS_DEVELOPMENT ? [homeNavItem] : [],
	links: [],
} satisfies NavMapping;

const navMap: Partial<Record<PagePath, NavMapping>> = {
	[PagePath.ROOT]: rootNavMapping,
};

/**
 * Get the navigation mapping for the given path.
 * @param path - The path to get the navigation item for.
 * @returns - A navigation mapping object.
 */
export function getNavItems(path: PagePath): NavMapping {
	return navMap[path] ?? rootNavMapping;
}
