import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/actions/user";
import { useUserStore } from "@/stores/user-store";
import { logError } from "@/utils/logging";

import { DeleteAccountModal } from "./delete-account-modal";

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
}));

vi.mock("@/actions/user", () => ({
	deleteAccount: vi.fn(),
}));

vi.mock("@/stores/user-store", () => ({
	useUserStore: vi.fn(),
}));

vi.mock("@/utils/logging", () => ({
	logError: vi.fn(),
}));

describe("DeleteAccountModal", () => {
	const mockOnClose = vi.fn();
	const mockPush = vi.fn();
	const mockClearUser = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useRouter).mockReturnValue({
			push: mockPush,
		} as any);
		vi.mocked(useUserStore).mockReturnValue(mockClearUser);
	});

	it("renders modal content when open", () => {
		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		expect(screen.getByTestId("delete-account-modal")).toBeInTheDocument();
		expect(screen.getByText("Are you sure you want to delete your account?")).toBeInTheDocument();
		expect(
			screen.getByText(
				"This will permanently delete your account, including all associated research projects, applications, and data. This action cannot be undone.",
			),
		).toBeInTheDocument();
		expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
		expect(screen.getByTestId("delete-button")).toBeInTheDocument();
	});

	it("does not render when closed", () => {
		render(<DeleteAccountModal isOpen={false} onClose={mockOnClose} />);

		expect(screen.queryByTestId("delete-account-modal")).not.toBeInTheDocument();
	});

	it("calls onClose when cancel button is clicked", async () => {
		const user = userEvent.setup();
		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		await user.click(screen.getByTestId("cancel-button"));

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(vi.mocked(deleteAccount)).not.toHaveBeenCalled();
	});

	it("calls onClose when X button is clicked", async () => {
		const user = userEvent.setup();
		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		await user.click(screen.getByTestId("close-button"));

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(vi.mocked(deleteAccount)).not.toHaveBeenCalled();
	});

	it("handles successful account deletion", async () => {
		const user = userEvent.setup();
		vi.mocked(deleteAccount).mockResolvedValue({ message: "Account deleted", success: true });

		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		const deleteButton = screen.getByTestId("delete-button");
		await user.click(deleteButton);

		await waitFor(() => {
			expect(vi.mocked(deleteAccount)).toHaveBeenCalledTimes(1);
		});

		expect(mockClearUser).toHaveBeenCalledTimes(1);
		expect(mockPush).toHaveBeenCalledWith("/login?message=account-deleted");
	});

	it("shows loading state during deletion", async () => {
		const user = userEvent.setup();
		let resolvePromise: (value: { message: string; success: boolean }) => void;

		const deletePromise = new Promise<{ message: string; success: boolean }>((resolve) => {
			resolvePromise = resolve;
		});

		vi.mocked(deleteAccount).mockReturnValue(deletePromise);

		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		const deleteButton = screen.getByTestId("delete-button");
		const cancelButton = screen.getByTestId("cancel-button");

		expect(deleteButton).not.toHaveAttribute("disabled");
		expect(cancelButton).not.toHaveAttribute("disabled");
		expect(deleteButton).toHaveTextContent("Delete and log out");

		await user.click(deleteButton);

		await waitFor(() => {
			expect(screen.getByTestId("delete-button")).toHaveTextContent("Deleting...");
		});

		const updatedDeleteButton = screen.getByTestId("delete-button");
		const updatedCancelButton = screen.getByTestId("cancel-button");
		expect(updatedDeleteButton).toHaveAttribute("disabled");
		expect(updatedCancelButton).toHaveAttribute("disabled");

		resolvePromise!({ message: "Account deleted", success: true });

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalled();
		});
	});

	it("handles deletion error gracefully", async () => {
		const user = userEvent.setup();
		const error = new Error("Deletion failed");
		vi.mocked(deleteAccount).mockRejectedValue(error);

		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		const deleteButton = screen.getByTestId("delete-button");
		await user.click(deleteButton);

		await waitFor(() => {
			expect(vi.mocked(logError)).toHaveBeenCalledWith({
				error,
				identifier: "DeleteAccountModal.handleDelete",
			});
		});

		expect(mockClearUser).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();

		expect(screen.getByTestId("delete-button")).not.toHaveAttribute("disabled");
		expect(screen.getByTestId("delete-button")).toHaveTextContent("Delete and log out");
	});

	it("displays correct button text", () => {
		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		expect(screen.getByTestId("cancel-button")).toHaveTextContent("Cancel");
		expect(screen.getByTestId("delete-button")).toHaveTextContent("Delete and log out");
	});

	it("displays warning about data permanence", () => {
		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		expect(screen.getByText(/permanently delete/)).toBeInTheDocument();
		expect(screen.getByText(/research projects/)).toBeInTheDocument();
		expect(screen.getByText(/applications/)).toBeInTheDocument();
		expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
	});

	it("uses proper button variants", () => {
		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		const cancelButton = screen.getByTestId("cancel-button");
		const deleteButton = screen.getByTestId("delete-button");

		expect(cancelButton).toHaveClass("w-[90px]");
		expect(deleteButton).toHaveClass("bg-[#1e13f8]");
	});

	it("has proper accessibility attributes", () => {
		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		const closeButton = screen.getByTestId("close-button");
		expect(closeButton).toHaveAttribute("aria-label", "Close modal");
		expect(screen.getByText("Close")).toHaveClass("sr-only");
	});
});