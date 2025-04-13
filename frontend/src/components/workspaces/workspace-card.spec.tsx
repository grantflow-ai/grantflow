import { render, screen } from "@testing-library/react";
import { WorkspaceCard } from "./workspace-card";
import { PagePath } from "@/enums";

describe("WorkspaceCard", () => {
	const mockWorkspaceOwner = {
		description: "This is a test workspace description",
		id: "workspace-123",
		name: "Test Workspace",
		role: "OWNER" as const,
	};

	const mockWorkspaceAdmin = {
		description: "This is an admin workspace",
		id: "workspace-456",
		name: "Admin Workspace",
		role: "ADMIN" as const,
	};

	const mockWorkspaceMember = {
		description: "This is a member workspace",
		id: "workspace-789",
		name: "Member Workspace",
		role: "MEMBER" as const,
	};

	it("renders workspace details correctly", () => {
		render(<WorkspaceCard workspace={mockWorkspaceOwner} />);

		expect(screen.getByText("Test Workspace")).toBeInTheDocument();
		expect(screen.getByText("This is a test workspace description")).toBeInTheDocument();
		expect(screen.getByText("OWNER")).toBeInTheDocument();
	});

	it("links to the correct workspace detail page", () => {
		render(<WorkspaceCard workspace={mockWorkspaceOwner} />);

		const link = screen.getByTestId(`workspace-link-${mockWorkspaceOwner.id}`);
		const expectedUrl = PagePath.WORKSPACE_DETAIL.toString().replace(":workspaceId", mockWorkspaceOwner.id);

		expect(link).toHaveAttribute("href", expectedUrl);
	});

	it("applies the correct badge color for OWNER role", () => {
		render(<WorkspaceCard workspace={mockWorkspaceOwner} />);

		const badge = screen.getByText("OWNER");
		expect(badge).toHaveClass("bg-primary/10");
		expect(badge).toHaveClass("text-primary");
	});

	it("applies the correct badge color for ADMIN role", () => {
		render(<WorkspaceCard workspace={mockWorkspaceAdmin} />);

		const badge = screen.getByText("ADMIN");
		expect(badge).toHaveClass("bg-secondary/20");
		expect(badge).toHaveClass("text-secondary-foreground");
	});

	it("applies the correct badge color for MEMBER role", () => {
		render(<WorkspaceCard workspace={mockWorkspaceMember} />);

		const badge = screen.getByText("MEMBER");
		expect(badge).toHaveClass("bg-accent/20");
		expect(badge).toHaveClass("text-accent-foreground");
	});

	it("truncates long workspace names and descriptions", () => {
		const longNameWorkspace = {
			...mockWorkspaceOwner,
			description:
				"This is an extremely long description that should definitely be truncated in the UI to prevent it from taking up too much space and causing layout issues",
			name: "This is a very long workspace name that should be truncated in the UI",
		};

		render(<WorkspaceCard workspace={longNameWorkspace} />);

		const nameElement = screen.getByText(longNameWorkspace.name);
		const descriptionElement = screen.getByText(longNameWorkspace.description);

		expect(nameElement).toHaveClass("line-clamp-1");
		expect(descriptionElement).toHaveClass("line-clamp-2");
	});
});
