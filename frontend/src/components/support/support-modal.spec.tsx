import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SupportModal } from "./support-modal";

const getLatestModal = async () => {
	const modals = await screen.findAllByTestId("support-modal");
	return modals.at(-1)!;
};

describe.sequential("SupportModal", () => {
	const mockOnClose = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("should render the modal with all its content when open", async () => {
		render(<SupportModal isOpen={true} onClose={mockOnClose} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);

		expect(modalQueries.getByText("Contact Support")).toBeInTheDocument();
		expect(modalQueries.getByText(/If you have an issue or question/)).toBeInTheDocument();
		expect(modalQueries.getByPlaceholderText("contact@example.org")).toBeInTheDocument();
		expect(modalQueries.getByPlaceholderText("Brief summary of your request")).toBeInTheDocument();
		expect(modalQueries.getByTestId("cancel-button")).toBeInTheDocument();
		expect(modalQueries.getByTestId("submit-button")).toBeInTheDocument();
	});

	it("should not render the modal's content when closed", async () => {
		render(<SupportModal isOpen={false} onClose={mockOnClose} />);
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(screen.queryByText("Contact Support")).not.toBeInTheDocument();
	});

	it("should allow the user to type an email address", async () => {
		const user = userEvent.setup();
		render(<SupportModal isOpen={true} onClose={mockOnClose} />);

		const modal = await getLatestModal();
		const emailInput = within(modal).getByPlaceholderText("contact@example.org");

		await user.type(emailInput, "test@example.com");

		await waitFor(() => {
			expect(emailInput).toHaveValue("test@example.com");
		});
	});

	it("should allow the user to type a subject", async () => {
		const user = userEvent.setup();
		render(<SupportModal isOpen={true} onClose={mockOnClose} />);

		const modal = await getLatestModal();
		const subjectTextarea = within(modal).getByPlaceholderText("Brief summary of your request");

		await user.type(subjectTextarea, "This is a test subject");

		await waitFor(() => {
			expect(subjectTextarea).toHaveValue("This is a test subject");
		});
	});

	it("should call onClose when the cancel button is clicked", async () => {
		const user = userEvent.setup();
		render(<SupportModal isOpen={true} onClose={mockOnClose} />);

		const modal = await getLatestModal();
		const cancelButton = within(modal).getByTestId("cancel-button");
		await user.click(cancelButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("should have a submit button that can be clicked", async () => {
		const user = userEvent.setup();
		render(<SupportModal isOpen={true} onClose={mockOnClose} />);

		const modal = await getLatestModal();
		const submitButton = within(modal).getByTestId("submit-button");

		expect(submitButton).toBeInTheDocument();
		await user.click(submitButton);
		// Currently non-functional, so we just check for its presence and clickability
	});
});
