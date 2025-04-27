import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CreateWorkspaceForm } from "./create-workspace-form";
import { createWorkspace } from "@/actions/workspace";
import { mockToast } from "::testing/global-mocks";
import userEvent from "@testing-library/user-event";

vi.mock("@/actions/workspace", () => ({
	createWorkspace: vi.fn(),
}));

vi.mock("@/utils/logging", () => ({
	logError: vi.fn(),
}));

describe("CreateWorkspaceForm", () => {
	const mockCloseModal = vi.fn();
	const mockCreateWorkspace = vi.mocked(createWorkspace);

	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateWorkspace.mockResolvedValue({ id: "workspace-123" });
	});

	it("renders the form correctly", () => {
		render(<CreateWorkspaceForm closeModal={mockCloseModal} />);

		expect(screen.getByTestId("create-workspace-form")).toBeInTheDocument();
		expect(screen.getByLabelText("Name *")).toBeInTheDocument();
		expect(screen.getByLabelText("Description")).toBeInTheDocument();
		expect(screen.getByTestId("create-workspace-submit-button")).toBeInTheDocument();
		expect(screen.getByText("Create Workspace")).toBeInTheDocument();
	});

	it("validates workspace name length", async () => {
		render(<CreateWorkspaceForm closeModal={mockCloseModal} />);

		const nameInput = screen.getByTestId("create-workspace-name-input");
		await userEvent.type(nameInput, "ab");
		fireEvent.blur(nameInput);

		const submitButton = screen.getByTestId("create-workspace-submit-button");
		expect(submitButton).toBeDisabled();

		await userEvent.clear(nameInput);
		await userEvent.type(nameInput, "Valid Name");

		expect(submitButton).not.toBeDisabled();
	});

	it("submits the form with valid data", async () => {
		render(<CreateWorkspaceForm closeModal={mockCloseModal} />);

		const nameInput = screen.getByTestId("create-workspace-name-input");
		const descriptionTextarea = screen.getByTestId("create-workspace-description-textarea");

		await userEvent.type(nameInput, "Test Workspace");
		await userEvent.type(descriptionTextarea, "This is a test workspace description");

		const submitButton = screen.getByTestId("create-workspace-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(createWorkspace).toHaveBeenCalledWith({
				description: "This is a test workspace description",
				name: "Test Workspace",
			});
			expect(mockCloseModal).toHaveBeenCalledWith("workspace-123");
		});
	});

	it("handles API errors gracefully", async () => {
		mockCreateWorkspace.mockRejectedValue(new Error("API Error"));

		render(<CreateWorkspaceForm closeModal={mockCloseModal} />);

		const nameInput = screen.getByTestId("create-workspace-name-input");
		await userEvent.type(nameInput, "Test Workspace");

		const submitButton = screen.getByTestId("create-workspace-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith("An error occurred while creating the workspace.");
			expect(mockCloseModal).toHaveBeenCalledWith();
		});
	});

	it("shows loading state during form submission", async () => {
		mockCreateWorkspace.mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => resolve({ id: "workspace-123" }), 100);
				}),
		);

		render(<CreateWorkspaceForm closeModal={mockCloseModal} />);

		const nameInput = screen.getByTestId("create-workspace-name-input");
		await userEvent.type(nameInput, "Test Workspace");

		const submitButton = screen.getByTestId("create-workspace-submit-button");
		fireEvent.click(submitButton);

		expect(submitButton).toHaveAttribute("aria-busy", "true");

		await waitFor(() => {
			expect(mockCloseModal).toHaveBeenCalledWith("workspace-123");
		});
	});
});
