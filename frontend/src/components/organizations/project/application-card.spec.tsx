import { ApplicationCardDataFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationCard } from "./application-card";

describe("ApplicationCard", () => {
	const mockOnDelete = vi.fn();
	const mockOnDuplicate = vi.fn();
	const mockOnOpen = vi.fn();

	const defaultProps = {
		onDelete: mockOnDelete,
		onDuplicate: mockOnDuplicate,
		onOpen: mockOnOpen,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render application card with basic information", () => {
		const application = ApplicationCardDataFactory.build({
			id: "app-123",
			status: "WORKING_DRAFT",
			title: "Test Application",
		});

		render(<ApplicationCard application={application} {...defaultProps} />);

		expect(screen.getByTestId("application-card-app-123")).toBeInTheDocument();
		expect(screen.getByTestId("application-card-title-app-123")).toHaveTextContent("Test Application");
		expect(screen.getByTestId("application-card-status-app-123")).toBeInTheDocument();
		expect(screen.getByTestId("application-card-open-button-app-123")).toBeInTheDocument();
	});

	it("should display description when provided", () => {
		const application = ApplicationCardDataFactory.build({
			description: "This is a test application description",
			id: "app-123",
		});

		render(<ApplicationCard application={application} {...defaultProps} />);

		expect(screen.getByTestId("application-card-description-app-123")).toHaveTextContent(
			"This is a test application description",
		);
	});

	it("should not display description when not provided", () => {
		const application = ApplicationCardDataFactory.build({
			description: undefined,
			id: "app-123",
		});

		render(<ApplicationCard application={application} {...defaultProps} />);

		expect(screen.queryByTestId("application-card-description-app-123")).not.toBeInTheDocument();
	});

	it("should display correct status styling for different statuses", () => {
		const statuses = ["WORKING_DRAFT", "IN_PROGRESS", "GENERATING", "CANCELLED"] as const;

		statuses.forEach((status) => {
			const application = ApplicationCardDataFactory.build({ id: `app-${status}`, status });
			const { unmount } = render(<ApplicationCard application={application} {...defaultProps} />);

			const statusElement = screen.getByTestId(`application-card-status-app-${status}`);
			expect(statusElement).toBeInTheDocument();

			unmount();
		});
	});

	it("should call onOpen when open button is clicked", async () => {
		const user = userEvent.setup();
		const application = ApplicationCardDataFactory.build({
			id: "app-123",
			title: "Test Application",
		});

		render(<ApplicationCard application={application} {...defaultProps} />);

		const openButton = screen.getByTestId("application-card-open-button-app-123");
		await user.click(openButton);

		expect(mockOnOpen).toHaveBeenCalledWith("app-123", "Test Application");
	});

	it("should display formatted last edited date", () => {
		const application = ApplicationCardDataFactory.build({
			id: "app-123",
			updated_at: "2023-12-15T10:30:00Z",
		});

		render(<ApplicationCard application={application} {...defaultProps} />);

		expect(screen.getByText("Last edited 15.12.23")).toBeInTheDocument();
	});

	it("should display deadline when provided", () => {
		const application = {
			created_at: "2023-12-01T10:00:00Z",
			deadline: "2024-01-15T12:00:00Z",
			id: "app-123",
			project_id: "project-123",
			status: "WORKING_DRAFT" as const,
			title: "Test Application",
			updated_at: "2023-12-15T10:30:00Z",
		};

		render(<ApplicationCard application={application} {...defaultProps} />);

		expect(screen.getByText(/Deadline passed/)).toBeInTheDocument();
	});

	it("should not display deadline when not provided", () => {
		const application = ApplicationCardDataFactory.build({
			deadline: undefined,
			id: "app-123",
		});

		render(<ApplicationCard application={application} {...defaultProps} />);

		expect(screen.queryByText(/Deadline/)).not.toBeInTheDocument();
	});
});
