import { mockToast } from "::testing/global-mocks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createProject } from "@/actions/project";

import { CreateProjectForm } from "./create-project-form";

vi.mock("@/actions/project", () => ({
	createProject: vi.fn(),
}));

vi.mock("@/utils/logging", () => ({
	logError: vi.fn(),
}));

describe("CreateProjectForm", () => {
	const mockCloseModal = vi.fn();
	const mockCreateProject = vi.mocked(createProject);

	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateProject.mockResolvedValue({ id: "project-123" });
	});

	it("renders the form correctly", () => {
		render(<CreateProjectForm closeModal={mockCloseModal} />);

		expect(screen.getByTestId("create-project-form")).toBeInTheDocument();
		expect(screen.getByLabelText("Name *")).toBeInTheDocument();
		expect(screen.getByLabelText("Description")).toBeInTheDocument();
		expect(screen.getByTestId("create-project-submit-button")).toBeInTheDocument();
		expect(screen.getByText("Create Project")).toBeInTheDocument();
	});

	it("validates project name length", async () => {
		render(<CreateProjectForm closeModal={mockCloseModal} />);

		const nameInput = screen.getByTestId("create-project-name-input");
		await userEvent.type(nameInput, "ab");
		fireEvent.blur(nameInput);

		const submitButton = screen.getByTestId("create-project-submit-button");
		expect(submitButton).toBeDisabled();

		await userEvent.clear(nameInput);
		await userEvent.type(nameInput, "Valid Name");

		expect(submitButton).not.toBeDisabled();
	});

	it("submits the form with valid data", async () => {
		render(<CreateProjectForm closeModal={mockCloseModal} />);

		const nameInput = screen.getByTestId("create-project-name-input");
		const descriptionTextarea = screen.getByTestId("create-project-description-textarea");

		await userEvent.type(nameInput, "Test Project");
		await userEvent.type(descriptionTextarea, "This is a test project description");

		const submitButton = screen.getByTestId("create-project-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(createProject).toHaveBeenCalledWith({
				description: "This is a test project description",
				name: "Test Project",
			});
			expect(mockCloseModal).toHaveBeenCalledWith("project-123");
		});
	});

	it("handles API errors gracefully", async () => {
		mockCreateProject.mockRejectedValue(new Error("API Error"));

		render(<CreateProjectForm closeModal={mockCloseModal} />);

		const nameInput = screen.getByTestId("create-project-name-input");
		await userEvent.type(nameInput, "Test Project");

		const submitButton = screen.getByTestId("create-project-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith("An error occurred while creating the project.");
			expect(mockCloseModal).toHaveBeenCalledWith();
		});
	});

	it("shows loading state during form submission", async () => {
		mockCreateProject.mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => resolve({ id: "project-123" }), 100);
				}),
		);

		render(<CreateProjectForm closeModal={mockCloseModal} />);

		const nameInput = screen.getByTestId("create-project-name-input");
		await userEvent.type(nameInput, "Test Project");

		const submitButton = screen.getByTestId("create-project-submit-button");
		fireEvent.click(submitButton);

		expect(submitButton).toHaveAttribute("aria-busy", "true");

		await waitFor(() => {
			expect(mockCloseModal).toHaveBeenCalledWith("project-123");
		});
	});
});
