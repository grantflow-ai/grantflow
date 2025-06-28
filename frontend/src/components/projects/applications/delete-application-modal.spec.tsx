import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeleteApplicationModal } from "./delete-application-modal";

describe("DeleteApplicationModal", () => {
	const mockOnClose = vi.fn();
	const mockOnConfirm = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders modal content when open", () => {
		render(<DeleteApplicationModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		expect(screen.getByTestId("delete-application-modal")).toBeInTheDocument();
		expect(screen.getByText("Are you sure you want to delete this application?")).toBeInTheDocument();
		expect(screen.getByText("This action is permanent and cannot be undone.")).toBeInTheDocument();
		expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
		expect(screen.getByTestId("delete-button")).toBeInTheDocument();
	});

	it("does not render when closed", () => {
		render(<DeleteApplicationModal isOpen={false} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		expect(screen.queryByTestId("delete-application-modal")).not.toBeInTheDocument();
	});

	it("calls onClose when cancel button is clicked", async () => {
		const user = userEvent.setup();
		render(<DeleteApplicationModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		const cancelButton = screen.getByTestId("cancel-button");
		await user.click(cancelButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnConfirm).not.toHaveBeenCalled();
	});

	it("calls onClose when X button is clicked", async () => {
		const user = userEvent.setup();
		render(<DeleteApplicationModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		const closeButton = screen.getByTestId("close-modal-button");
		await user.click(closeButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnConfirm).not.toHaveBeenCalled();
	});

	it("calls both onConfirm and onClose when delete button is clicked", async () => {
		const user = userEvent.setup();
		render(<DeleteApplicationModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		const deleteButton = screen.getByTestId("delete-button");
		await user.click(deleteButton);

		expect(mockOnConfirm).toHaveBeenCalledTimes(1);
		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("calls onClose when backdrop is clicked", async () => {
		render(<DeleteApplicationModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		expect(mockOnClose).not.toHaveBeenCalled();
	});

	it("closes modal when Escape key is pressed", async () => {
		const user = userEvent.setup();
		render(<DeleteApplicationModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		await user.keyboard("{Escape}");

		expect(mockOnClose).toHaveBeenCalled();
	});
});
