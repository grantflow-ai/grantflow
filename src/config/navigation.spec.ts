import { PagePath } from "@/enums";
import { getNavItems } from "@/config/navigation";
import { getEnv } from "@/utils/env";

vi.mock("@/utils/env", () => ({
	getEnv: vi.fn(() => ({})),
}));

describe("Navigation Items", () => {
	describe("getNavItems function", () => {
		it("should return empty rootNavMapping for ROOT path when in production", () => {
			const result = getNavItems(PagePath.ROOT);
			expect(result).toEqual({
				items: [],
				links: [],
			});
		});

		it("should return empty rootNavMapping for undefined path when in production", () => {
			const result = getNavItems("UNDEFINED_PATH" as PagePath);
			expect(result).toEqual({
				items: [],
				links: [],
			});
		});

		it("should return the expected rootNavMapping for when in development", () => {
			vi.mocked(getEnv).mockReturnValue({
				NEXT_PUBLIC_IS_DEVELOPMENT: true,
			} as any);
			const result = getNavItems(PagePath.ROOT);
			expect(result).toEqual({
				items: [
					{
						title: "Home",
						href: "/",
					},
				],
				links: [],
			});
		});
	});

	describe("NavItem structure", () => {
		it("should have correct structure for homeNavItem", () => {
			vi.mocked(getEnv).mockReturnValue({
				NEXT_PUBLIC_IS_DEVELOPMENT: true,
			} as any);
			const { items } = getNavItems(PagePath.ROOT);
			expect(items.length).toEqual(1);
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
