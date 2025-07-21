import { ProjectFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateProjectForm } from "./create-project-form";

// Mock dependencies
vi.mock("@/actions/project", () => ({
	createProject: vi.fn(),
}));
vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));
vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
	},
}));

const mockCreateProject = vi.mocked(await import("@/actions/project").then((m) => m.createProject));
const mockCloseModal = vi.fn();

describe("CreateProjectForm", () => {
	const defaultProps = {
		closeModal: mockCloseModal,
		organizationId: "org-123",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render form with all fields and buttons", () => {
		render(<CreateProjectForm {...defaultProps} />);

		expect(screen.getByTestId("create-project-form")).toBeInTheDocument();
		expect(screen.getByTestId("create-project-name-input")).toBeInTheDocument();
		expect(screen.getByTestId("create-project-description-textarea")).toBeInTheDocument();
		expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
		expect(screen.getByTestId("create-project-submit-button")).toBeInTheDocument();

		expect(screen.getByText("Name *")).toBeInTheDocument();
		expect(screen.getByText("Description")).toBeInTheDocument();
		expect(screen.getByText("Cancel")).toBeInTheDocument();
		expect(screen.getByText("Create Project")).toBeInTheDocument();
	});

	it("should have submit button disabled initially", () => {
		render(<CreateProjectForm {...defaultProps} />);

		const submitButton = screen.getByTestId("create-project-submit-button");
		expect(submitButton).toBeDisabled();
	});

	it("should enable submit button when name is valid", async () => {
		const user = userEvent.setup();
		render(<CreateProjectForm {...defaultProps} />);

		const nameInput = screen.getByTestId("create-project-name-input");
		const submitButton = screen.getByTestId("create-project-submit-button");

		await user.type(nameInput, "Test Project");

		await waitFor(() => {
			expect(submitButton).not.toBeDisabled();
		});
	});

	it("should show validation error for short project name", async () => {
		const user = userEvent.setup();
		render(<CreateProjectForm {...defaultProps} />);

		const nameInput = screen.getByTestId("create-project-name-input");
		await user.type(nameInput, "ab");
		await user.tab(); // Trigger validation

		await waitFor(() => {
			expect(screen.getByText("Project name must be at least 3 characters long")).toBeInTheDocument();
		});
	});

	it("should submit form with valid data", async () => {
		const user = userEvent.setup();
		const mockProject = ProjectFactory.build({ id: "project-123" });
		mockCreateProject.mockResolvedValue(mockProject);

		render(<CreateProjectForm {...defaultProps} />);

		const nameInput = screen.getByTestId("create-project-name-input");
		const descriptionInput = screen.getByTestId("create-project-description-textarea");
		const submitButton = screen.getByTestId("create-project-submit-button");

		await user.type(nameInput, "Test Project");
		await user.type(descriptionInput, "Test Description");

		await waitFor(() => {
			expect(submitButton).not.toBeDisabled();
		});

		await user.click(submitButton);

		await waitFor(() => {
			expect(mockCreateProject).toHaveBeenCalledWith("org-123", {
				description: "Test Description",
				name: "Test Project",
			});
		});

		expect(mockCloseModal).toHaveBeenCalledWith("project-123");
	});

	it("should submit form with only name (description optional)", async () => {
		const user = userEvent.setup();
		const mockProject = ProjectFactory.build({ id: "project-456" });
		mockCreateProject.mockResolvedValue(mockProject);

		render(<CreateProjectForm {...defaultProps} />);

		const nameInput = screen.getByTestId("create-project-name-input");
		const submitButton = screen.getByTestId("create-project-submit-button");

		await user.type(nameInput, "Another Project");

		await waitFor(() => {
			expect(submitButton).not.toBeDisabled();
		});

		await user.click(submitButton);

		await waitFor(() => {
			expect(mockCreateProject).toHaveBeenCalledWith("org-123", {
				description: "",
				name: "Another Project",
			});
		});

		expect(mockCloseModal).toHaveBeenCalledWith("project-456");
	});

	it("should handle form submission errors", async () => {
		const user = userEvent.setup();
		const error = new Error("Creation failed");
		mockCreateProject.mockRejectedValue(error);

		render(<CreateProjectForm {...defaultProps} />);

		const nameInput = screen.getByTestId("create-project-name-input");
		const submitButton = screen.getByTestId("create-project-submit-button");

		await user.type(nameInput, "Test Project");

		await waitFor(() => {
			expect(submitButton).not.toBeDisabled();
		});

		await user.click(submitButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("An error occurred while creating the project.");
		});

		expect(mockCloseModal).toHaveBeenCalledWith();
	});

	it("should call closeModal when cancel button is clicked", async () => {
		const user = userEvent.setup();
		render(<CreateProjectForm {...defaultProps} />);

		const cancelButton = screen.getByTestId("cancel-button");
		await user.click(cancelButton);

		expect(mockCloseModal).toHaveBeenCalledWith();
	});

	it("should show loading state during form submission", async () => {
		const user = userEvent.setup();
		// Mock a slow response
		mockCreateProject.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

		render(<CreateProjectForm {...defaultProps} />);

		const nameInput = screen.getByTestId("create-project-name-input");
		const submitButton = screen.getByTestId("create-project-submit-button");

		await user.type(nameInput, "Test Project");

		await waitFor(() => {
			expect(submitButton).not.toBeDisabled();
		});

		await user.click(submitButton);

		// Check that the button shows loading state
		await waitFor(() => {
			expect(submitButton).toBeDisabled();
		});
	});

	it("should handle empty form submission attempt", async () => {
		render(<CreateProjectForm {...defaultProps} />);

		const submitButton = screen.getByTestId("create-project-submit-button");

		// Submit button should be disabled for empty form
		expect(submitButton).toBeDisabled();

		// Try to trigger form submission (should not work since button is disabled)
		expect(mockCreateProject).not.toHaveBeenCalled();
	});

	it("should clear validation errors when user corrects input", async () => {
		const user = userEvent.setup();
		render(<CreateProjectForm {...defaultProps} />);

		const nameInput = screen.getByTestId("create-project-name-input");

		// First enter invalid input
		await user.type(nameInput, "ab");
		await user.tab();

		await waitFor(() => {
			expect(screen.getByText("Project name must be at least 3 characters long")).toBeInTheDocument();
		});

		// Clear and enter valid input
		await user.clear(nameInput);
		await user.type(nameInput, "Valid Project Name");

		await waitFor(() => {
			expect(screen.queryByText("Project name must be at least 3 characters long")).not.toBeInTheDocument();
		});
	});
});
