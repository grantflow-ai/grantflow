import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Modal } from "./modal";

describe("Modal", () => {
	const mockOnClose = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		
		document.body.style.overflow = "";
	});

	it("renders when open", () => {
		render(
			<Modal isOpen onClose={mockOnClose}>
				<div data-testid="modal-content">Modal Content</div>
			</Modal>,
		);

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByTestId("modal-content")).toBeInTheDocument();
	});

	it("does not render when closed", () => {
		render(
			<Modal isOpen={false} onClose={mockOnClose}>
				<div data-testid="modal-content">Modal Content</div>
			</Modal>,
		);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.queryByTestId("modal-content")).not.toBeInTheDocument();
	});

	it("calls onClose when clicking overlay", async () => {
		const user = userEvent.setup();

		render(
			<Modal isOpen onClose={mockOnClose}>
				<div data-testid="modal-content">Modal Content</div>
			</Modal>,
		);

		const dialog = screen.getByRole("dialog");
		await user.click(dialog);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("does not call onClose when clicking modal content", async () => {
		const user = userEvent.setup();

		render(
			<Modal isOpen onClose={mockOnClose}>
				<div data-testid="modal-content">Modal Content</div>
			</Modal>,
		);

		const content = screen.getByTestId("modal-content");
		await user.click(content);

		expect(mockOnClose).not.toHaveBeenCalled();
	});

	it("calls onClose when pressing Escape", async () => {
		const user = userEvent.setup();

		render(
			<Modal isOpen onClose={mockOnClose}>
				<div data-testid="modal-content">Modal Content</div>
			</Modal>,
		);

		await user.keyboard("{Escape}");

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("prevents body scroll when open", async () => {
		render(
			<Modal isOpen onClose={mockOnClose}>
				<div>Content</div>
			</Modal>,
		);

		await waitFor(() => {
			expect(document.body.style.overflow).toBe("hidden");
		});
	});

	it("restores body scroll when closed", async () => {
		const { rerender } = render(
			<Modal isOpen onClose={mockOnClose}>
				<div>Content</div>
			</Modal>,
		);

		expect(document.body.style.overflow).toBe("hidden");

		rerender(
			<Modal isOpen={false} onClose={mockOnClose}>
				<div>Content</div>
			</Modal>,
		);

		await waitFor(() => {
			expect(document.body.style.overflow).toBe("");
		});
	});

	it("renders in document.body via portal", () => {
		const { container } = render(
			<Modal isOpen onClose={mockOnClose}>
				<div data-testid="modal-content">Modal Content</div>
			</Modal>,
		);

		
		expect(container.firstChild).toBeNull();

		
		expect(document.body.querySelector('[role="dialog"]')).toBeInTheDocument();
	});

	it("maintains accessibility attributes", () => {
		render(
			<Modal isOpen onClose={mockOnClose}>
				<div>Content</div>
			</Modal>,
		);

		const dialog = screen.getByRole("dialog");
		expect(dialog).toHaveAttribute("aria-modal", "true");
		expect(dialog).toHaveAttribute("tabIndex", "-1");
	});

	it("cleans up event listeners on unmount", () => {
		const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

		const { unmount } = render(
			<Modal isOpen onClose={mockOnClose}>
				<div>Content</div>
			</Modal>,
		);

		unmount();

		expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
		expect(document.body.style.overflow).toBe("");

		removeEventListenerSpy.mockRestore();
	});
});
