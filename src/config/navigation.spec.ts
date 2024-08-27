import { PagePath } from "@/config/enums";
import { getNavItems } from "@/config/navigation";
import { SiGithub } from "@icons-pack/react-simple-icons";

describe("Navigation Items", () => {
	describe("getNavItems function", () => {
		it("should return rootNavMapping for ROOT path", () => {
			const result = getNavItems(PagePath.ROOT);
			expect(result).toEqual({
				items: [{ title: "Home", href: "/" }],
				links: [{ href: "https://github.com/trumpet-org/next-shadcn-supabase-auth", icon: SiGithub, name: "GitHub" }],
			});
		});

		it("should return rootNavMapping for undefined path", () => {
			const result = getNavItems("UNDEFINED_PATH" as PagePath);
			expect(result).toEqual({
				items: [{ title: "Home", href: "/" }],
				links: [{ href: "https://github.com/trumpet-org/next-shadcn-supabase-auth", icon: SiGithub, name: "GitHub" }],
			});
		});
	});

	describe("NavItem structure", () => {
		it("should have correct structure for homeNavItem", () => {
			const { items } = getNavItems(PagePath.ROOT);
			expect(items[0]).toHaveProperty("title", "Home");
			expect(items[0]).toHaveProperty("href", "/");
		});
	});

	describe("NavLink structure", () => {
		it("should have correct structure for githubNavLink", () => {
			const { links } = getNavItems(PagePath.ROOT);
			expect(links[0]).toHaveProperty("href", "https://github.com/trumpet-org/next-shadcn-supabase-auth");
			expect(links[0]).toHaveProperty("icon", SiGithub);
			expect(links[0]).toHaveProperty("name", "GitHub");
		});
	});

	describe("NavMapping structure", () => {
		it("should have items and links properties", () => {
			const result = getNavItems(PagePath.ROOT);
			expect(result).toHaveProperty("items");
			expect(result).toHaveProperty("links");
			expect(Array.isArray(result.items)).toBe(true);
			expect(Array.isArray(result.links)).toBe(true);
		});
	});
});
