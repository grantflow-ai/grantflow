import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeleteProjectModal } from "./delete-project-modal";

describe("DeleteProjectModal", () => {
	const mockOnClose = vi.fn();
	const mockOnConfirm = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders modal content when open", () => {
		render(<DeleteProjectModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		expect(screen.getByTestId("delete-project-modal")).toBeInTheDocument();
		expect(screen.getByText("Are you sure you want to delete this research project?")).toBeInTheDocument();
		expect(
			screen.getByText(
				"If the project contains applications, they will also be permanently deleted. This action cannot be undone.",
			),
		).toBeInTheDocument();
		expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
		expect(screen.getByTestId("delete-button")).toBeInTheDocument();
	});

	it("does not render when closed", () => {
		render(<DeleteProjectModal isOpen={false} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		expect(screen.queryByTestId("delete-project-modal")).not.toBeInTheDocument();
	});

	it("calls onClose when cancel button is clicked", async () => {
		const user = userEvent.setup();
		render(<DeleteProjectModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		const cancelButton = screen.getByTestId("cancel-button");
		await user.click(cancelButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnConfirm).not.toHaveBeenCalled();
	});

	it("calls both onConfirm and onClose when delete button is clicked", async () => {
		const user = userEvent.setup();
		render(<DeleteProjectModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		const deleteButton = screen.getByTestId("delete-button");
		await user.click(deleteButton);

		expect(mockOnConfirm).toHaveBeenCalledTimes(1);
		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("displays correct button text", () => {
		render(<DeleteProjectModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		expect(screen.getByTestId("cancel-button")).toHaveTextContent("Cancel");
		expect(screen.getByTestId("delete-button")).toHaveTextContent("Delete");
	});

	it("has proper button types to prevent form submission", () => {
		render(<DeleteProjectModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		expect(screen.getByTestId("cancel-button")).toHaveAttribute("type", "button");
		expect(screen.getByTestId("delete-button")).toHaveAttribute("type", "button");
	});

	it("displays warning about permanent deletion", () => {
		render(<DeleteProjectModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

		expect(screen.getByText(/permanently deleted/)).toBeInTheDocument();
		expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
	});
});
