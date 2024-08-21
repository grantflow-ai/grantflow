import { PagePath } from "@/config/enums";
import type { NavItem, NavLink, NavMapping } from "@/types/nav-types";
import { SiGithub } from "@icons-pack/react-simple-icons";

const homeNavItem = {
	title: "Home",
	href: "/",
} satisfies NavItem;

const githubNavLink = {
	href: "https://github.com/trumpet-org/next-shadcn-supabase-auth",
	icon: SiGithub,
	name: "GitHub",
} satisfies NavLink;

const rootNavMapping = {
	items: [homeNavItem],
	links: [githubNavLink],
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
