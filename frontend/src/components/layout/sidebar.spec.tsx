import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";

import { Sidebar } from "./sidebar";

vi.mock("next/navigation", () => ({
	usePathname: vi.fn(),
}));

vi.mock("next/link", () => ({
	default: ({ children, className, href, title, ...props }: any) => (
		<a className={className} href={href} title={title} {...props}>
			{children}
		</a>
	),
}));

describe("Sidebar", () => {
	beforeEach(() => {
		vi.mocked(usePathname).mockReturnValue("/projects");
	});

	it("renders the sidebar with all elements", () => {
		render(<Sidebar />);

		expect(screen.getByTestId("sidebar")).toBeInTheDocument();
		expect(screen.getByTestId("logo")).toBeInTheDocument();
		expect(screen.getByTestId("toggle-sidebar-button")).toBeInTheDocument();
		expect(screen.getByTestId("main-nav-dashboard")).toBeInTheDocument();
		expect(screen.getByTestId("help-button")).toBeInTheDocument();
		expect(screen.getByTestId("logout-button")).toBeInTheDocument();
	});

	it("displays the logo with correct text", () => {
		render(<Sidebar />);

		const logo = screen.getByTestId("logo");
		expect(logo).toHaveTextContent("G");
	});

	it("renders navigation links for applications and settings", () => {
		render(<Sidebar />);

		expect(screen.getByTestId("nav-link-applications")).toBeInTheDocument();
		expect(screen.getByTestId("nav-link-settings")).toBeInTheDocument();
	});

	it("applies correct href to navigation links", () => {
		render(<Sidebar />);

		const applicationsLink = screen.getByTestId("nav-link-applications");
		const settingsLink = screen.getByTestId("nav-link-settings");

		expect(applicationsLink).toHaveAttribute("href", "/applications");
		expect(settingsLink).toHaveAttribute("href", "/settings");
	});

	it("applies correct title attributes", () => {
		render(<Sidebar />);

		expect(screen.getByTestId("toggle-sidebar-button")).toHaveAttribute("title", "Toggle sidebar");
		expect(screen.getByTestId("nav-link-applications")).toHaveAttribute("title", "Applications");
		expect(screen.getByTestId("nav-link-settings")).toHaveAttribute("title", "Settings");
		expect(screen.getByTestId("help-button")).toHaveAttribute("title", "Help");
		expect(screen.getByTestId("logout-button")).toHaveAttribute("title", "Logout");
	});

	it("highlights active applications link when on applications page", () => {
		vi.mocked(usePathname).mockReturnValue("/applications");
		render(<Sidebar />);

		const applicationsLink = screen.getByTestId("nav-link-applications");
		const settingsLink = screen.getByTestId("nav-link-settings");

		expect(applicationsLink).toHaveClass("text-[#1e13f8]");
		expect(settingsLink).toHaveClass("text-[#636170]", "hover:text-[#2e2d36]");
	});

	it("highlights active settings link when on settings page", () => {
		vi.mocked(usePathname).mockReturnValue("/settings");
		render(<Sidebar />);

		const applicationsLink = screen.getByTestId("nav-link-applications");
		const settingsLink = screen.getByTestId("nav-link-settings");

		expect(settingsLink).toHaveClass("text-[#1e13f8]");
		expect(applicationsLink).toHaveClass("text-[#636170]", "hover:text-[#2e2d36]");
	});

	it("does not highlight any link when on unrelated page", () => {
		vi.mocked(usePathname).mockReturnValue("/some-other-page");
		render(<Sidebar />);

		const applicationsLink = screen.getByTestId("nav-link-applications");
		const settingsLink = screen.getByTestId("nav-link-settings");

		expect(applicationsLink).toHaveClass("text-[#636170]", "hover:text-[#2e2d36]");
		expect(settingsLink).toHaveClass("text-[#636170]", "hover:text-[#2e2d36]");
	});

	it("dashboard button is always highlighted", () => {
		vi.mocked(usePathname).mockReturnValue("/applications");
		render(<Sidebar />);

		const dashboardButton = screen.getByTestId("main-nav-dashboard");
		expect(dashboardButton).toHaveClass("bg-[#1e13f8]");
	});

	it("has correct button types", () => {
		render(<Sidebar />);

		expect(screen.getByTestId("toggle-sidebar-button")).toHaveAttribute("type", "button");
		expect(screen.getByTestId("help-button")).toHaveAttribute("type", "button");
		expect(screen.getByTestId("logout-button")).toHaveAttribute("type", "button");
	});

	it("renders with correct CSS classes for layout", () => {
		render(<Sidebar />);

		const sidebar = screen.getByTestId("sidebar");
		expect(sidebar).toHaveClass(
			"flex",
			"h-full",
			"w-16",
			"flex-col",
			"items-center",
			"bg-[#faf9fb]",
			"border-r",
			"border-[#e1dfeb]",
		);
	});

	it("displays all icons correctly", () => {
		render(<Sidebar />);

		const container = screen.getByTestId("sidebar");
		const svgs = container.querySelectorAll("svg");
		expect(svgs.length).toBeGreaterThan(0);

		expect(svgs.length).toBe(5);
	});

	it("handles different pathname formats", () => {
		vi.mocked(usePathname).mockReturnValue("/applications/");
		const { rerender } = render(<Sidebar />);

		let applicationsLink = screen.getByTestId("nav-link-applications");
		expect(applicationsLink).toHaveClass("text-[#636170]");

		vi.mocked(usePathname).mockReturnValue("/applications");
		rerender(<Sidebar />);

		applicationsLink = screen.getByTestId("nav-link-applications");
		expect(applicationsLink).toHaveClass("text-[#1e13f8]");
	});

	it("maintains consistent styling across different states", () => {
		const pathnames = ["/projects", "/applications", "/settings", "/other"];

		pathnames.forEach((pathname) => {
			vi.mocked(usePathname).mockReturnValue(pathname);
			const { rerender } = render(<Sidebar />);

			expect(screen.getByTestId("sidebar")).toBeInTheDocument();
			expect(screen.getByTestId("logo")).toBeInTheDocument();
			expect(screen.getByTestId("main-nav-dashboard")).toBeInTheDocument();

			rerender(null);
		});
	});
});