import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BaseModal } from "./base-modal";

describe("BaseModal", () => {
	const mockOnClose = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders when open", () => {
		render(
			<BaseModal isOpen onClose={mockOnClose}>
				<div data-testid="modal-content">Modal Content</div>
			</BaseModal>,
		);

		expect(screen.getByTestId("modal-content")).toBeInTheDocument();
	});

	it("does not render when closed", () => {
		render(
			<BaseModal isOpen={false} onClose={mockOnClose}>
				<div data-testid="modal-content">Modal Content</div>
			</BaseModal>,
		);

		expect(screen.queryByTestId("modal-content")).not.toBeInTheDocument();
	});

	it("renders with title when provided", () => {
		render(
			<BaseModal isOpen onClose={mockOnClose} title="Test Modal">
				<div>Content</div>
			</BaseModal>,
		);

		expect(screen.getByText("Test Modal")).toBeInTheDocument();
	});

	it("renders without title when not provided", () => {
		render(
			<BaseModal isOpen onClose={mockOnClose}>
				<div>Content</div>
			</BaseModal>,
		);

		expect(screen.getByText("Modal")).toBeInTheDocument();
		expect(screen.getByText("Modal dialog")).toBeInTheDocument();

		const visibleHeadings = screen
			.queryAllByRole("heading")
			.filter((heading) => !heading.classList.contains("sr-only"));
		expect(visibleHeadings).toHaveLength(0);
	});

	it("calls onClose when clicking outside", async () => {
		const user = userEvent.setup();

		render(
			<BaseModal isOpen onClose={mockOnClose}>
				<div data-testid="modal-content">Modal Content</div>
			</BaseModal>,
		);

		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(mockOnClose).toHaveBeenCalled();
		});
	});

	it("calls onClose when pressing Escape", async () => {
		const user = userEvent.setup();

		render(
			<BaseModal isOpen onClose={mockOnClose}>
				<div data-testid="modal-content">Modal Content</div>
			</BaseModal>,
		);

		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(mockOnClose).toHaveBeenCalled();
		});
	});

	it("maintains accessibility attributes", () => {
		render(
			<BaseModal isOpen onClose={mockOnClose} title="Accessible Modal">
				<div>Content</div>
			</BaseModal>,
		);

		expect(screen.getByText("Accessible Modal")).toBeInTheDocument();
		expect(screen.getByText("Accessible Modal modal dialog")).toBeInTheDocument();

		const dialog = screen.getByRole("dialog");
		expect(dialog).toBeInTheDocument();
	});

	it("handles dynamic open/close state", () => {
		const { rerender } = render(
			<BaseModal isOpen onClose={mockOnClose}>
				<div data-testid="modal-content">Modal Content</div>
			</BaseModal>,
		);

		expect(screen.getByTestId("modal-content")).toBeInTheDocument();

		rerender(
			<BaseModal isOpen={false} onClose={mockOnClose}>
				<div data-testid="modal-content">Modal Content</div>
			</BaseModal>,
		);

		expect(screen.queryByTestId("modal-content")).not.toBeInTheDocument();
	});
});