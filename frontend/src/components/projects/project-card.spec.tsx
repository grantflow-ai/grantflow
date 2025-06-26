import { ProjectListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { PagePath } from "@/enums";

import { ProjectCard } from "./project-card";

describe("ProjectCard", () => {
	const mockProjectOwner = ProjectListItemFactory.build({
		description: "This is a test project description",
		id: "project-123",
		name: "Test Project",
		role: "OWNER",
	});

	const mockProjectAdmin = ProjectListItemFactory.build({
		description: "This is an admin project",
		id: "project-456",
		name: "Admin Project",
		role: "ADMIN",
	});

	const mockProjectMember = ProjectListItemFactory.build({
		description: "This is a member project",
		id: "project-789",
		name: "Member Project",
		role: "MEMBER",
	});

	it("renders project details correctly", () => {
		render(<ProjectCard project={mockProjectOwner} />);

		expect(screen.getByText("Test Project")).toBeInTheDocument();
		expect(screen.getByText("This is a test project description")).toBeInTheDocument();
		expect(screen.getByText("OWNER")).toBeInTheDocument();
	});

	it("links to the correct project detail page", () => {
		render(<ProjectCard project={mockProjectOwner} />);

		const link = screen.getByTestId(`project-link-${mockProjectOwner.id}`);
		const expectedUrl = PagePath.PROJECT_DETAIL.toString().replace(":projectId", mockProjectOwner.id);

		expect(link).toHaveAttribute("href", expectedUrl);
	});

	it("applies the correct badge color for OWNER role", () => {
		render(<ProjectCard project={mockProjectOwner} />);

		const badge = screen.getByText("OWNER");
		expect(badge).toHaveClass("bg-primary/10");
		expect(badge).toHaveClass("text-primary");
	});

	it("applies the correct badge color for ADMIN role", () => {
		render(<ProjectCard project={mockProjectAdmin} />);

		const badge = screen.getByText("ADMIN");
		expect(badge).toHaveClass("bg-secondary/20");
		expect(badge).toHaveClass("text-secondary-foreground");
	});

	it("applies the correct badge color for MEMBER role", () => {
		render(<ProjectCard project={mockProjectMember} />);

		const badge = screen.getByText("MEMBER");
		expect(badge).toHaveClass("bg-accent/20");
		expect(badge).toHaveClass("text-accent-foreground");
	});

	it("truncates long project names and descriptions", () => {
		const longNameProject = ProjectListItemFactory.build({
			...mockProjectOwner,
			description:
				"This is an extremely long description that should definitely be truncated in the UI to prevent it from taking up too much space and causing layout issues",
			name: "This is a very long project name that should be truncated in the UI",
		});
		render(<ProjectCard project={longNameProject} />);

		const nameElement = screen.getByText(longNameProject.name);
		const descriptionElement = screen.getByText(longNameProject.description!);

		expect(nameElement).toHaveClass("line-clamp-1");
		expect(descriptionElement).toHaveClass("line-clamp-2");
	});
});