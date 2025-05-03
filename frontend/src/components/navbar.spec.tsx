import { render, screen } from "@testing-library/react";
import { Breadcrumbs, Navbar } from "@/components/navbar";
import { mockUsePathname } from "::testing/global-mocks";

describe("Navbar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the navbar with breadcrumbs and theme toggle", () => {
		mockUsePathname.mockReturnValue("/workspaces");

		render(<Navbar />);

		expect(screen.getByTestId("navbar")).toBeInTheDocument();
		expect(screen.getByTestId("navbar-actions")).toBeInTheDocument();
		expect(screen.getByTestId("theme-toggle-button")).toBeInTheDocument();
		expect(screen.getByText("Workspaces")).toBeInTheDocument();
	});
});

describe("Breadcrumbs", () => {
	it("renders simple path correctly", () => {
		render(<Breadcrumbs pathname="/workspaces" />);

		expect(screen.getByText("Workspaces")).toBeInTheDocument();
	});

	it("renders nested path with workspace details", () => {
		render(<Breadcrumbs pathname="/workspaces/123" />);

		const workspacesLink = screen.getByRole("link", { name: "Workspaces" });
		expect(workspacesLink).toBeInTheDocument();
		expect(workspacesLink).toHaveAttribute("href", "/workspaces");

		expect(screen.getByText("Workspace Details")).toBeInTheDocument();
	});

	it("renders applications path correctly", () => {
		render(<Breadcrumbs pathname="/applications" />);

		expect(screen.getByText("Applications")).toBeInTheDocument();
	});

	it("renders nested applications path correctly", () => {
		render(<Breadcrumbs pathname="/applications/456" />);

		const applicationsLink = screen.getByRole("link", { name: "Applications" });
		expect(applicationsLink).toBeInTheDocument();
		expect(applicationsLink).toHaveAttribute("href", "/applications");

		expect(screen.getByText("Application Details")).toBeInTheDocument();
	});

	it("renders multi-level paths correctly", () => {
		render(<Breadcrumbs pathname="/workspaces/123/applications/456" />);

		const workspacesLink = screen.getByRole("link", { name: "Workspaces" });
		expect(workspacesLink).toBeInTheDocument();
		expect(workspacesLink).toHaveAttribute("href", "/workspaces");

		const workspaceDetailsLink = screen.getByRole("link", { name: "Workspace Details" });
		expect(workspaceDetailsLink).toBeInTheDocument();
		expect(workspaceDetailsLink).toHaveAttribute("href", "/workspaces/123");

		expect(screen.getByText("Applications")).toBeInTheDocument();
	});
});
