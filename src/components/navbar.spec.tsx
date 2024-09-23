import { getNavItems } from "@/config/navigation";
import { fireEvent, render, screen } from "@testing-library/react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "./navbar";

vi.mock("next/navigation");
vi.mock("next-themes");
vi.mock("@/config/navigation");

describe("Navbar", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(getNavItems).mockReturnValue({ items: [], links: [] });
		vi.mocked(usePathname).mockReturnValue("/");
		vi.mocked(useTheme).mockReturnValue({ theme: "light", setTheme: vi.fn() } as any);
	});

	const renderNavbar = () => {
		return render(<Navbar />);
	};

	it("renders the logo", () => {
		renderNavbar();
		expect(screen.getByTestId("logo")).toBeInTheDocument();
	});

	it("renders the theme toggle", () => {
		renderNavbar();
		expect(screen.getByTestId("theme-toggle-button")).toBeInTheDocument();
	});

	it("renders navigation items correctly", () => {
		vi.mocked(getNavItems).mockReturnValue({
			items: [
				{ title: "Home", href: "/" },
				{ title: "About", href: "/about" },
			],
			links: [],
		});

		renderNavbar();

		expect(screen.getByTestId("navbar-item-home")).toBeInTheDocument();
		expect(screen.getByTestId("navbar-item-about")).toBeInTheDocument();
	});

	it("renders external links correctly", () => {
		vi.mocked(getNavItems).mockReturnValue({
			items: [],
			links: [
				{ name: "GitHub", href: "https://github.com", icon: () => <span>GH</span> },
				{ name: "Twitter", href: "https://twitter.com", icon: () => <span>TW</span> },
			],
		});

		renderNavbar();

		expect(screen.getByTestId("navbar-link-github")).toBeInTheDocument();
		expect(screen.getByTestId("navbar-link-twitter")).toBeInTheDocument();
	});

	it("uses the correct pathname for getNavItems", () => {
		const usePathnameMock = vi.fn().mockReturnValue("/about");
		vi.mocked(usePathname).mockImplementation(usePathnameMock);

		const getNavItemsMock = vi.fn().mockReturnValue({ items: [], links: [] });
		vi.mocked(getNavItems).mockImplementation(getNavItemsMock);

		renderNavbar();

		expect(getNavItemsMock).toHaveBeenCalledWith("/about");
	});

	it("renders nothing for items without href", () => {
		vi.mocked(getNavItems).mockReturnValue({
			items: [{ title: "No Link" }, { title: "With Link", href: "/link" }],
			links: [],
		});

		renderNavbar();

		expect(screen.queryByText("No Link")).not.toBeInTheDocument();
		expect(screen.getByText("With Link")).toBeInTheDocument();
	});

	it("renders correctly when there are no links", () => {
		vi.mocked(getNavItems).mockReturnValue({
			items: [{ title: "Home", href: "/" }],
			links: [],
		});

		renderNavbar();

		expect(screen.queryByTestId("navbar-links")).not.toBeInTheDocument();
	});

	it("toggles theme when theme toggle button is clicked", () => {
		const setThemeMock = vi.fn();
		vi.mocked(useTheme).mockReturnValue({ theme: "light", setTheme: setThemeMock } as any);

		renderNavbar();

		const themeToggleButton = screen.getByTestId("theme-toggle-button");
		fireEvent.click(themeToggleButton);

		expect(setThemeMock).toHaveBeenCalledWith("dark");
	});
});
