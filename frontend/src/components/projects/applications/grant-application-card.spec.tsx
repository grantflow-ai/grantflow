import { ApplicationListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { PagePath } from "@/enums";

import { GrantApplicationCard } from "./grant-application-card";

describe("GrantApplicationCard", () => {
	const mockProjectId = "project-123";

	const mockApplication = ApplicationListItemFactory.build({
		completed_at: null,
		id: "app-456",
		title: "Research Grant Application",
	});

	const mockCompletedApplication = ApplicationListItemFactory.build({
		completed_at: "2025-03-15",
		id: "app-789",
		title: "Completed Grant Application",
	});

	it("renders application details correctly", () => {
		render(<GrantApplicationCard application={mockApplication} projectId={mockProjectId} />);

		expect(screen.getByText("Research Grant Application")).toBeInTheDocument();
		expect(screen.getByTestId(`application-draft-link-${mockApplication.id}`)).toBeInTheDocument();
	});

	it("links to the wizard page with applicationId for draft applications", () => {
		render(<GrantApplicationCard application={mockApplication} projectId={mockProjectId} />);

		const link = screen.getByTestId(`application-draft-link-${mockApplication.id}`);
		const expectedUrl = `/projects/${mockProjectId}/applications/${mockApplication.id}/wizard`;

		expect(link).toHaveAttribute("href", expectedUrl);
	});

	it("links to the application detail page for completed applications", () => {
		render(<GrantApplicationCard application={mockCompletedApplication} projectId={mockProjectId} />);

		const link = screen.getByTestId(`application-draft-link-${mockCompletedApplication.id}`);
		const expectedUrl = PagePath.APPLICATION_DETAIL.toString()
			.replace(":projectId", mockProjectId)
			.replace(":applicationId", mockCompletedApplication.id);

		expect(link).toHaveAttribute("href", expectedUrl);
	});

	it("displays the file icon", () => {
		render(<GrantApplicationCard application={mockApplication} projectId={mockProjectId} />);

		const fileIcon = screen.getByText("Research Grant Application").previousSibling;
		expect(fileIcon).toHaveClass("text-primary");
	});

	it("shows completion date badge for completed applications", () => {
		render(<GrantApplicationCard application={mockCompletedApplication} projectId={mockProjectId} />);

		expect(screen.getByText("2025-03-15")).toBeInTheDocument();
		const badge = screen.getByText("2025-03-15");
		expect(badge).toHaveClass("bg-secondary/50");
		expect(badge).toHaveClass("text-secondary-foreground");
	});

	it("does not show completion date badge for incomplete applications", () => {
		render(<GrantApplicationCard application={mockApplication} projectId={mockProjectId} />);

		expect(screen.queryByRole("badge")).not.toBeInTheDocument();
	});

	it("has hover styling classes for interactive elements", () => {
		render(<GrantApplicationCard application={mockApplication} projectId={mockProjectId} />);

		const card = screen.getByTestId(`application-draft-link-${mockApplication.id}`).firstChild;
		expect(card).toHaveClass("hover:shadow-md");
		expect(card).toHaveClass("hover:bg-muted/50");
	});
});
