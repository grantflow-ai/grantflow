import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as grantingInstitutionsActions from "@/actions/granting-institutions";
import type { API } from "@/types/api-types";

import { GrantingInstitutionForm } from "./granting-institution-form";

const mockPush = vi.fn();
const mockBack = vi.fn();
const mockRefresh = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		back: mockBack,
		push: mockPush,
		refresh: mockRefresh,
		replace: mockReplace,
	}),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("@/actions/granting-institutions");

const mockCreateGrantingInstitution = vi.mocked(grantingInstitutionsActions.createGrantingInstitution);
const mockUpdateGrantingInstitution = vi.mocked(grantingInstitutionsActions.updateGrantingInstitution);
const mockDeleteGrantingInstitution = vi.mocked(grantingInstitutionsActions.deleteGrantingInstitution);

describe("GrantingInstitutionForm", () => {
	const user = userEvent.setup();

	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateGrantingInstitution.mockResolvedValue({
			abbreviation: null,
			created_at: "2023-01-01T00:00:00Z",
			full_name: "Test Institution",
			id: "test-id",
			source_count: 0,
			updated_at: "2023-01-01T00:00:00Z",
		});
		mockUpdateGrantingInstitution.mockResolvedValue({
			abbreviation: null,
			created_at: "2023-01-01T00:00:00Z",
			full_name: "Test Institution",
			id: "test-id",
			source_count: 0,
			updated_at: "2023-01-01T00:00:00Z",
		});
		mockDeleteGrantingInstitution.mockResolvedValue(undefined);
	});

	describe("Create Mode", () => {
		it("renders form in create mode with empty fields", () => {
			render(<GrantingInstitutionForm mode="create" />);

			expect(screen.getByTestId("full-name-input")).toHaveValue("");
			expect(screen.getByTestId("abbreviation-input")).toHaveValue("");
			expect(screen.getByTestId("submit-button")).toHaveTextContent("Create");
			expect(screen.queryByTestId("delete-button")).not.toBeInTheDocument();
		});

		it("successfully creates a new institution", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const abbreviationInput = screen.getByTestId("abbreviation-input");
			const submitButton = screen.getByTestId("submit-button");

			await user.type(fullNameInput, "National Institutes of Health");
			await user.type(abbreviationInput, "NIH");
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockCreateGrantingInstitution).toHaveBeenCalledWith({
					abbreviation: "NIH",
					full_name: "National Institutes of Health",
				});
				expect(toast.success).toHaveBeenCalledWith("Granting institution created successfully");
				expect(mockReplace).toHaveBeenCalledWith("/admin/granting-institutions");
			});
		});

		it("creates institution without abbreviation", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const submitButton = screen.getByTestId("submit-button");

			await user.type(fullNameInput, "Test Institution");
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockCreateGrantingInstitution).toHaveBeenCalledWith({
					abbreviation: null,
					full_name: "Test Institution",
				});
			});
		});

		it("trims whitespace from inputs before creating", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const abbreviationInput = screen.getByTestId("abbreviation-input");
			const submitButton = screen.getByTestId("submit-button");

			await user.type(fullNameInput, "  Test Institution  ");
			await user.type(abbreviationInput, "  TI  ");
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockCreateGrantingInstitution).toHaveBeenCalledWith({
					abbreviation: "TI",
					full_name: "Test Institution",
				});
			});
		});

		it("shows error when creation fails", async () => {
			mockCreateGrantingInstitution.mockRejectedValueOnce(new Error("Network error"));

			render(<GrantingInstitutionForm mode="create" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const submitButton = screen.getByTestId("submit-button");

			await user.type(fullNameInput, "Test Institution");
			await user.click(submitButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Failed to create granting institution. Please try again.");
			});
		});
	});

	describe("Edit Mode", () => {
		const mockInstitution: API.ListGrantingInstitutions.Http200.ResponseBody[0] = {
			abbreviation: "NIH",
			created_at: "2023-01-01T00:00:00Z",
			full_name: "National Institutes of Health",
			id: "test-id",
			source_count: 5,
			updated_at: "2023-01-01T00:00:00Z",
		};

		it("renders form in edit mode with pre-filled values", () => {
			render(<GrantingInstitutionForm institution={mockInstitution} mode="edit" />);

			expect(screen.getByTestId("full-name-input")).toHaveValue("National Institutes of Health");
			expect(screen.getByTestId("abbreviation-input")).toHaveValue("NIH");
			expect(screen.getByTestId("submit-button")).toHaveTextContent("Update");
			expect(screen.getByTestId("delete-button")).toBeInTheDocument();
		});

		it("successfully updates an institution", async () => {
			render(<GrantingInstitutionForm institution={mockInstitution} mode="edit" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const submitButton = screen.getByTestId("submit-button");

			await user.clear(fullNameInput);
			await user.type(fullNameInput, "Updated Name");
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockUpdateGrantingInstitution).toHaveBeenCalledWith("test-id", {
					abbreviation: "NIH",
					full_name: "Updated Name",
				});
				expect(toast.success).toHaveBeenCalledWith("Granting institution updated successfully");
				expect(mockReplace).toHaveBeenCalledWith("/admin/granting-institutions");
			});
		});

		it("shows error when update fails", async () => {
			mockUpdateGrantingInstitution.mockRejectedValueOnce(new Error("Network error"));

			render(<GrantingInstitutionForm institution={mockInstitution} mode="edit" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const submitButton = screen.getByTestId("submit-button");

			await user.clear(fullNameInput);
			await user.type(fullNameInput, "Updated Name");
			await user.click(submitButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Failed to update granting institution. Please try again.");
			});
		});

		it("opens delete dialog when delete button is clicked", async () => {
			render(<GrantingInstitutionForm institution={mockInstitution} mode="edit" />);

			const deleteButton = screen.getByTestId("delete-button");
			await user.click(deleteButton);

			await waitFor(() => {
				expect(screen.getByText("Delete Granting Institution")).toBeInTheDocument();
				expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
				expect(screen.getByText(/National Institutes of Health/i)).toBeInTheDocument();
			});
		});

		it("successfully deletes an institution", async () => {
			render(<GrantingInstitutionForm institution={mockInstitution} mode="edit" />);

			const deleteButton = screen.getByTestId("delete-button");
			await user.click(deleteButton);

			const confirmDeleteButton = screen.getByRole("button", { name: /Delete/i });
			await user.click(confirmDeleteButton);

			await waitFor(() => {
				expect(mockDeleteGrantingInstitution).toHaveBeenCalledWith("test-id");
				expect(toast.success).toHaveBeenCalledWith("Granting institution deleted successfully");
				expect(mockPush).toHaveBeenCalledWith("/admin/granting-institutions");
				expect(mockRefresh).toHaveBeenCalled();
			});
		});

		it("shows error when deletion fails", async () => {
			mockDeleteGrantingInstitution.mockRejectedValueOnce(new Error("Network error"));

			render(<GrantingInstitutionForm institution={mockInstitution} mode="edit" />);

			const deleteButton = screen.getByTestId("delete-button");
			await user.click(deleteButton);

			const confirmDeleteButton = screen.getByRole("button", { name: /Delete/i });
			await user.click(confirmDeleteButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Failed to delete granting institution");
			});
		});

		it("closes delete dialog when cancel is clicked", async () => {
			render(<GrantingInstitutionForm institution={mockInstitution} mode="edit" />);

			const deleteButton = screen.getByTestId("delete-button");
			await user.click(deleteButton);

			await waitFor(() => {
				expect(screen.getByText("Delete Granting Institution")).toBeInTheDocument();
			});

			const cancelButton = screen.getByRole("button", { name: /Cancel/i });
			await user.click(cancelButton);

			await waitFor(() => {
				expect(screen.queryByText("Delete Granting Institution")).not.toBeInTheDocument();
			});
		});
	});

	describe("Validation", () => {
		it("shows error when full name is empty", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const submitButton = screen.getByTestId("submit-button");
			await user.click(submitButton);

			expect(await screen.findByText("Full name is required")).toBeInTheDocument();
			expect(mockCreateGrantingInstitution).not.toHaveBeenCalled();
		});

		it("shows error when full name is too short", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const submitButton = screen.getByTestId("submit-button");

			await user.type(fullNameInput, "A");
			await user.click(submitButton);

			expect(await screen.findByText("Full name must be at least 2 characters")).toBeInTheDocument();
			expect(mockCreateGrantingInstitution).not.toHaveBeenCalled();
		});

		it.skip("shows error when full name is too long", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const submitButton = screen.getByTestId("submit-button");

			await user.type(fullNameInput, "A".repeat(201));
			await user.click(submitButton);

			expect(await screen.findByText("Full name must not exceed 200 characters")).toBeInTheDocument();
			expect(mockCreateGrantingInstitution).not.toHaveBeenCalled();
		});

		it.skip("shows error when abbreviation is too long", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const abbreviationInput = screen.getByTestId("abbreviation-input");
			const submitButton = screen.getByTestId("submit-button");

			await user.type(fullNameInput, "Test Institution");
			await user.type(abbreviationInput, "A".repeat(51));
			await user.click(submitButton);

			expect(await screen.findByText("Abbreviation must not exceed 50 characters")).toBeInTheDocument();
			expect(mockCreateGrantingInstitution).not.toHaveBeenCalled();
		});

		it("clears error when user starts typing", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const submitButton = screen.getByTestId("submit-button");

			await user.click(submitButton);
			expect(await screen.findByText("Full name is required")).toBeInTheDocument();

			await user.type(fullNameInput, "T");
			expect(screen.queryByText("Full name is required")).not.toBeInTheDocument();
		});

		it("validates only trimmed content", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const submitButton = screen.getByTestId("submit-button");

			await user.type(fullNameInput, "   ");
			await user.click(submitButton);

			expect(await screen.findByText("Full name is required")).toBeInTheDocument();
			expect(mockCreateGrantingInstitution).not.toHaveBeenCalled();
		});
	});

	describe("Form Controls", () => {
		it("navigates back when cancel button is clicked", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const cancelButton = screen.getByTestId("cancel-button");
			await user.click(cancelButton);

			expect(mockBack).toHaveBeenCalled();
		});

		it("disables all buttons while submitting", async () => {
			let resolveCreate: ((value: any) => void) | undefined;
			mockCreateGrantingInstitution.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveCreate = resolve;
					}),
			);

			render(<GrantingInstitutionForm mode="create" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const submitButton = screen.getByTestId("submit-button");
			const cancelButton = screen.getByTestId("cancel-button");

			await user.type(fullNameInput, "Test Institution");
			await user.click(submitButton);

			expect(submitButton).toBeDisabled();
			expect(cancelButton).toBeDisabled();
			expect(submitButton).toHaveTextContent("Saving...");

			resolveCreate!({
				abbreviation: null,
				full_name: "Test Institution",
				id: "test-id",
			});
		});

		it("disables delete button while deleting", async () => {
			let resolveDelete: (() => void) | undefined;
			mockDeleteGrantingInstitution.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveDelete = resolve;
					}),
			);

			const mockInstitution: API.ListGrantingInstitutions.Http200.ResponseBody[0] = {
				abbreviation: "NIH",
				created_at: "2023-01-01T00:00:00Z",
				full_name: "National Institutes of Health",
				id: "test-id",
				source_count: 5,
				updated_at: "2023-01-01T00:00:00Z",
			};

			render(<GrantingInstitutionForm institution={mockInstitution} mode="edit" />);

			const deleteButton = screen.getByTestId("delete-button");
			await user.click(deleteButton);

			const confirmDeleteButton = screen.getByRole("button", { name: /Delete/i });
			await user.click(confirmDeleteButton);

			expect(confirmDeleteButton).toBeDisabled();
			expect(confirmDeleteButton).toHaveTextContent("Deleting...");

			resolveDelete!();
		});

		it.skip("respects maxLength attributes", () => {
			render(<GrantingInstitutionForm mode="create" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const abbreviationInput = screen.getByTestId("abbreviation-input");

			// @ts-expect-error - HTMLElement type doesn't include maxLength
			expect(fullNameInput.maxLength).toBe(200);
			// @ts-expect-error - HTMLElement type doesn't include maxLength
			expect(abbreviationInput.maxLength).toBe(50);
		});
	});

	describe("Error Styling", () => {
		it("applies error border to full name input when invalid", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const submitButton = screen.getByTestId("submit-button");
			await user.click(submitButton);

			const fullNameInput = screen.getByTestId("full-name-input");
			expect(fullNameInput).toHaveClass("border-error");
		});

		it.skip("applies error border to abbreviation input when invalid", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const fullNameInput = screen.getByTestId("full-name-input");
			const abbreviationInput = screen.getByTestId("abbreviation-input");
			const submitButton = screen.getByTestId("submit-button");

			await user.type(fullNameInput, "Test Institution");
			await user.type(abbreviationInput, "A".repeat(51));
			await user.click(submitButton);

			expect(abbreviationInput).toHaveClass("border-error");
		});

		it("displays error messages with proper styling", async () => {
			render(<GrantingInstitutionForm mode="create" />);

			const submitButton = screen.getByTestId("submit-button");
			await user.click(submitButton);

			const errorMessage = await screen.findByText("Full name is required");
			expect(errorMessage).toHaveClass("text-error");
		});
	});
});
