import { createWorkspace } from "@/actions/workspace";
import en from "@/localisations/en.json";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateWorkspaceForm } from "./create-workspace-form";

vi.mock("@/actions/workspace");
vi.mock("sonner");

describe("CreateWorkspaceForm", () => {
	const mockCloseModal = vi.fn();

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("renders the form correctly", () => {
		render(<CreateWorkspaceForm locales={en} closeModal={mockCloseModal} />);

		expect(screen.getByTestId("create-workspace-form")).toBeInTheDocument();
		expect(screen.getByTestId("create-workspace-name-input")).toBeInTheDocument();
		expect(screen.getByTestId("create-workspace-submit-button")).toBeInTheDocument();
	});

	it("submits the form with valid data", async () => {
		const mockedCreateWorkspace = vi.mocked(createWorkspace);
		mockedCreateWorkspace.mockResolvedValueOnce(null as any);

		render(<CreateWorkspaceForm locales={en} closeModal={mockCloseModal} />);

		const input = screen.getByTestId("create-workspace-name-input");
		await userEvent.type(input, "New Workspace");

		const submitButton = screen.getByTestId("create-workspace-submit-button");
		expect(submitButton).not.toBeDisabled();
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockedCreateWorkspace).toHaveBeenCalledWith({
				description: "",
				name: "New Workspace",
			});
			expect(toast.success).toHaveBeenCalledWith(en.workspaceListView.workspaceCreatedSuccess);
			expect(mockCloseModal).toHaveBeenCalled();
		});
	});

	it("disables the button if the input is invalid", async () => {
		const mockedCreateWorkspace = vi.mocked(createWorkspace);
		mockedCreateWorkspace.mockRejectedValueOnce(new Error("API Error"));

		render(<CreateWorkspaceForm locales={en} closeModal={mockCloseModal} />);

		const input = screen.getByTestId("create-workspace-name-input");
		await userEvent.type(input, "Ne");
		const submitButton = screen.getByTestId("create-workspace-submit-button");

		expect(submitButton).toBeDisabled();
	});

	it("calls createWorkspace and shows success toast on successful submission", async () => {
		vi.mocked(createWorkspace).mockResolvedValue(null as any);

		render(<CreateWorkspaceForm locales={en} closeModal={mockCloseModal} />);

		const input = screen.getByTestId("create-workspace-name-input");
		const submitButton = screen.getByTestId("create-workspace-submit-button");

		await userEvent.type(input, "New Workspace");
		expect(submitButton).not.toBeDisabled();
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(createWorkspace).toHaveBeenCalledWith({
				description: "",
				name: "New Workspace",
			});
			expect(toast.success).toHaveBeenCalledWith(en.workspaceListView.workspaceCreatedSuccess);
			expect(mockCloseModal).toHaveBeenCalled();
		});
	});

	it("shows error toast on failed submission", async () => {
		vi.mocked(createWorkspace).mockResolvedValue("API Error");

		render(<CreateWorkspaceForm locales={en} closeModal={mockCloseModal} />);

		const input = screen.getByTestId("create-workspace-name-input");
		const submitButton = screen.getByTestId("create-workspace-submit-button");

		await userEvent.type(input, "New Workspace");
		expect(submitButton).not.toBeDisabled();
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(createWorkspace).toHaveBeenCalledWith({
				description: "",
				name: "New Workspace",
			});
			expect(toast.error).toHaveBeenCalledWith(en.workspaceListView.workspaceCreatedError);
			expect(mockCloseModal).toHaveBeenCalled();
		});
	});
});
