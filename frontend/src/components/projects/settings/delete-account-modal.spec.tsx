import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/actions/user";
import { DeleteAccountModal } from "@/components/projects";
import { useUserStore } from "@/stores/user-store";
import { log } from "@/utils/logger";

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
}));

vi.mock("@/actions/user", () => ({
	deleteAccount: vi.fn(),
}));

vi.mock("@/stores/user-store", () => ({
	useUserStore: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
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
				"This will schedule your account for deletion. You will be removed from all projects immediately, but your account can be restored within 30 days by contacting support. After 30 days, deletion will be permanent and cannot be undone.",
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

	it("calls onClose when close button is clicked", async () => {
		const user = userEvent.setup();
		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		const closeButton = screen.getByRole("button", { name: "Close" });
		await user.click(closeButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(vi.mocked(deleteAccount)).not.toHaveBeenCalled();
	});

	it("handles successful account deletion", async () => {
		const user = userEvent.setup();
		const mockResponse = {
			grace_period_days: 30,
			message: "Account scheduled for deletion",
			restoration_info: "Contact support within 30 days to restore your account",
			scheduled_deletion_date: "2024-02-15T00:00:00Z",
		};
		vi.mocked(deleteAccount).mockResolvedValue(mockResponse);

		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		const deleteButton = screen.getByTestId("delete-button");
		await user.click(deleteButton);

		await waitFor(() => {
			expect(vi.mocked(deleteAccount)).toHaveBeenCalledTimes(1);
		});

		expect(mockClearUser).toHaveBeenCalledTimes(1);
		expect(mockPush).toHaveBeenCalledWith(
			"/login?gracePeriod=30&message=account-deleted&scheduledDate=2024-02-15T00%3A00%3A00Z",
		);
	});

	it("shows loading state during deletion", async () => {
		const user = userEvent.setup();
		let resolvePromise: (value: {
			grace_period_days: number;
			message: string;
			restoration_info: string;
			scheduled_deletion_date: string;
		}) => void;

		const deletePromise = new Promise<{
			grace_period_days: number;
			message: string;
			restoration_info: string;
			scheduled_deletion_date: string;
		}>((resolve) => {
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

		resolvePromise!({
			grace_period_days: 30,
			message: "Account scheduled for deletion",
			restoration_info: "Contact support within 30 days to restore your account",
			scheduled_deletion_date: "2024-02-15T00:00:00Z",
		});

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
			expect(vi.mocked(log.error)).toHaveBeenCalledWith("DeleteAccountModal.handleDelete", error);
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

	it("displays warning about scheduled deletion", () => {
		render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

		expect(screen.getByText(/schedule your account for deletion/)).toBeInTheDocument();
		expect(screen.getByText(/removed from all projects immediately/)).toBeInTheDocument();
		expect(screen.getByText(/30 days/)).toBeInTheDocument();
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

		const dialog = screen.getByRole("dialog");
		expect(dialog).toHaveAttribute("aria-labelledby");
		expect(dialog).toHaveAttribute("aria-describedby");

		const closeButton = screen.getByRole("button", { name: "Close" });
		expect(closeButton).toBeInTheDocument();
	});
});
