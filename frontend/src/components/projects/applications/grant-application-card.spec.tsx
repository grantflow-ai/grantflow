import { ApplicationListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";

import { GrantApplicationCard } from "@/components/projects";

describe("GrantApplicationCard", () => {
	const mockProjectId = "project-123";
	const mockProjectName = "Climate Research Project";

	const mockApplication = ApplicationListItemFactory.build({
		completed_at: null,
		title: "Research Grant Application",
	});

	const mockCompletedApplication = ApplicationListItemFactory.build({
		completed_at: "2025-03-15",
		title: "Completed Grant Application",
	});

	it("renders application details correctly", () => {
		render(
			<GrantApplicationCard
				application={mockApplication}
				projectId={mockProjectId}
				projectName={mockProjectName}
			/>,
		);

		expect(screen.getByText("Research Grant Application")).toBeInTheDocument();
		expect(screen.getByTestId(`application-draft-link-${mockApplication.id}`)).toBeInTheDocument();
	});

	it("has button role and is clickable for draft applications", () => {
		render(
			<GrantApplicationCard
				application={mockApplication}
				projectId={mockProjectId}
				projectName={mockProjectName}
			/>,
		);

		const button = screen.getByTestId(`application-draft-link-${mockApplication.id}`);
		expect(button).toHaveAttribute("role", "button");
		expect(button).toHaveAttribute("tabIndex", "0");
	});

	it("has button role and is clickable for completed applications", () => {
		render(
			<GrantApplicationCard
				application={mockCompletedApplication}
				projectId={mockProjectId}
				projectName={mockProjectName}
			/>,
		);

		const button = screen.getByTestId(`application-draft-link-${mockCompletedApplication.id}`);
		expect(button).toHaveAttribute("role", "button");
		expect(button).toHaveAttribute("tabIndex", "0");
	});

	it("displays the file icon", () => {
		render(
			<GrantApplicationCard
				application={mockApplication}
				projectId={mockProjectId}
				projectName={mockProjectName}
			/>,
		);

		const fileIcon = screen.getByText("Research Grant Application").previousSibling;
		expect(fileIcon).toHaveClass("text-primary");
	});

	it("shows completion date badge for completed applications", () => {
		render(
			<GrantApplicationCard
				application={mockCompletedApplication}
				projectId={mockProjectId}
				projectName={mockProjectName}
			/>,
		);

		expect(screen.getByText("2025-03-15")).toBeInTheDocument();
		const badge = screen.getByText("2025-03-15");
		expect(badge).toHaveClass("bg-secondary/50");
		expect(badge).toHaveClass("text-secondary-foreground");
	});

	it("does not show completion date badge for incomplete applications", () => {
		render(
			<GrantApplicationCard
				application={mockApplication}
				projectId={mockProjectId}
				projectName={mockProjectName}
			/>,
		);

		expect(screen.queryByRole("badge")).not.toBeInTheDocument();
	});

	it("has hover styling classes for interactive elements", () => {
		render(
			<GrantApplicationCard
				application={mockApplication}
				projectId={mockProjectId}
				projectName={mockProjectName}
			/>,
		);

		const card = screen.getByTestId(`application-draft-link-${mockApplication.id}`).firstChild;
		expect(card).toHaveClass("hover:shadow-md");
		expect(card).toHaveClass("hover:bg-muted/50");
	});
});
