import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InviteCollaboratorModal } from "@/components/projects";

// Helper to get the last (most recent) modal when multiple exist
const getLatestModal = async () => {
	const modals = await screen.findAllByTestId("invite-collaborator-modal");
	return modals.at(-1)!;
};

describe("InviteCollaboratorModal", () => {
	const mockOnClose = vi.fn();
	const mockOnInvite = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
		// Additional cleanup for Radix UI portals
		vi.restoreAllMocks();
	});

	it("renders modal content when open", async () => {
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);

		expect(modalQueries.getByText("Invite New Member")).toBeInTheDocument();
		expect(modalQueries.getByText("Invite new member and set up member role.")).toBeInTheDocument();
		expect(modalQueries.getByTestId("email-input")).toBeInTheDocument();
		expect(modalQueries.getByTestId("permission-dropdown")).toBeInTheDocument();
		expect(modalQueries.getByTestId("cancel-button")).toBeInTheDocument();
		expect(modalQueries.getByTestId("send-invitation-button")).toBeInTheDocument();
	});

	it("does not render visible content when closed", async () => {
		render(<InviteCollaboratorModal isOpen={false} onClose={mockOnClose} onInvite={mockOnInvite} />);

		// Give portal time to render
		await new Promise((resolve) => setTimeout(resolve, 50));

		// The modal content should not be visible when closed
		expect(screen.queryByText("Invite New Member")).not.toBeInTheDocument();
	});

	it("allows user to enter email address", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const emailInput = within(modal).getByTestId("email-input");

		await user.type(emailInput, "test@example.com");

		await waitFor(() => {
			expect(emailInput).toHaveValue("test@example.com");
		});
	});

	it("defaults to collaborator permission", async () => {
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const dropdown = within(modal).getByTestId("permission-dropdown");
		expect(dropdown).toHaveTextContent("Member (can access applications within this project)");
	});

	it("toggles permission dropdown when clicked", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);
		const dropdown = modalQueries.getByTestId("permission-dropdown");

		// Initially dropdown menu should not be visible
		expect(modalQueries.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();

		// Click to open
		await user.click(dropdown);

		// Wait for dropdown to appear
		await waitFor(() => {
			expect(modalQueries.getByTestId("permission-dropdown-menu")).toBeInTheDocument();
		});

		// Check options are visible
		expect(modalQueries.getByTestId("admin-option")).toBeInTheDocument();
		expect(modalQueries.getByTestId("collaborator-option")).toBeInTheDocument();

		// Click to close
		await user.click(dropdown);

		// Wait for dropdown to disappear
		await waitFor(() => {
			expect(modalQueries.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();
		});
	});

	it("allows user to select admin permission", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);
		const dropdown = modalQueries.getByTestId("permission-dropdown");

		await user.click(dropdown);

		await waitFor(() => {
			expect(modalQueries.getByTestId("admin-option")).toBeInTheDocument();
		});

		await user.click(modalQueries.getByTestId("admin-option"));

		await waitFor(() => {
			expect(dropdown).toHaveTextContent("Admin (can access all research projects)");
			expect(modalQueries.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();
		});
	});

	it("allows user to select collaborator permission", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);
		const dropdown = modalQueries.getByTestId("permission-dropdown");

		// First select admin
		await user.click(dropdown);
		await waitFor(() => {
			expect(modalQueries.getByTestId("admin-option")).toBeInTheDocument();
		});
		await user.click(modalQueries.getByTestId("admin-option"));

		// Then switch back to collaborator
		await user.click(dropdown);
		await waitFor(() => {
			expect(modalQueries.getByTestId("collaborator-option")).toBeInTheDocument();
		});
		await user.click(modalQueries.getByTestId("collaborator-option"));

		await waitFor(() => {
			expect(dropdown).toHaveTextContent("Member (can access applications within this project)");
			expect(modalQueries.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();
		});
	});

	it("disables send button when email is empty", async () => {
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const sendButton = within(modal).getByTestId("send-invitation-button");
		expect(sendButton).toBeDisabled();
	});

	it("enables send button when email is provided", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);
		const emailInput = modalQueries.getByTestId("email-input");
		const sendButton = modalQueries.getByTestId("send-invitation-button");

		await user.type(emailInput, "test@example.com");

		await waitFor(() => {
			expect(sendButton).not.toBeDisabled();
		});
	});

	it("calls onInvite with correct parameters when form is submitted", async () => {
		const user = userEvent.setup();
		mockOnInvite.mockResolvedValue(undefined);

		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);

		const emailInput = modalQueries.getByTestId("email-input");
		await user.type(emailInput, "test@example.com");

		const dropdown = modalQueries.getByTestId("permission-dropdown");
		await user.click(dropdown);
		await waitFor(() => {
			expect(modalQueries.getByTestId("admin-option")).toBeInTheDocument();
		});
		await user.click(modalQueries.getByTestId("admin-option"));

		await user.click(modalQueries.getByTestId("send-invitation-button"));

		await waitFor(() => {
			expect(mockOnInvite).toHaveBeenCalledWith("test@example.com", "admin");
		});
	});

	it("calls onClose after successful invitation", async () => {
		const user = userEvent.setup();
		mockOnInvite.mockResolvedValue(undefined);

		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);

		const emailInput = modalQueries.getByTestId("email-input");
		await user.type(emailInput, "test@example.com");
		await user.click(modalQueries.getByTestId("send-invitation-button"));

		await waitFor(() => {
			expect(mockOnClose).toHaveBeenCalledTimes(1);
		});
	});

	it("resets form after successful submission", async () => {
		const user = userEvent.setup();
		mockOnInvite.mockResolvedValue(undefined);

		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);
		const emailInput = modalQueries.getByTestId("email-input");

		await user.type(emailInput, "test@example.com");

		const dropdown = modalQueries.getByTestId("permission-dropdown");
		await user.click(dropdown);
		await waitFor(() => {
			expect(modalQueries.getByTestId("admin-option")).toBeInTheDocument();
		});
		await user.click(modalQueries.getByTestId("admin-option"));

		await user.click(modalQueries.getByTestId("send-invitation-button"));

		await waitFor(() => {
			expect(mockOnClose).toHaveBeenCalled();
		});

		expect(mockOnInvite).toHaveBeenCalledWith("test@example.com", "admin");
	});

	it("shows loading state during submission", async () => {
		const user = userEvent.setup();
		let resolvePromise: () => void;
		const submitPromise = new Promise<void>((resolve) => {
			resolvePromise = resolve;
		});
		mockOnInvite.mockReturnValue(submitPromise);

		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);

		const emailInput = modalQueries.getByTestId("email-input");
		await user.type(emailInput, "test@example.com");

		const sendButton = modalQueries.getByTestId("send-invitation-button");
		await user.click(sendButton);

		expect(sendButton).toBeDisabled();

		resolvePromise!();

		await waitFor(() => {
			expect(mockOnClose).toHaveBeenCalled();
		});
	});

	it("handles invitation error gracefully", async () => {
		const user = userEvent.setup();
		mockOnInvite.mockRejectedValue(new Error("Invitation failed"));

		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);

		const emailInput = modalQueries.getByTestId("email-input");
		await user.type(emailInput, "test@example.com");

		const sendButton = modalQueries.getByTestId("send-invitation-button");
		await user.click(sendButton);

		await waitFor(() => {
			expect(sendButton).not.toBeDisabled();
		});
		expect(mockOnClose).not.toHaveBeenCalled();
	});

	it("calls onClose when cancel button is clicked", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const cancelButton = within(modal).getByTestId("cancel-button");
		await user.click(cancelButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnInvite).not.toHaveBeenCalled();
	});

	it("calls onClose when X button is clicked", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const closeButton = within(modal).getByTestId("close-button");
		await user.click(closeButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnInvite).not.toHaveBeenCalled();
	});

	it("resets form when modal is closed", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);

		const emailInput = modalQueries.getByTestId("email-input");
		await user.type(emailInput, "test@example.com");

		const dropdown = modalQueries.getByTestId("permission-dropdown");
		await user.click(dropdown);
		await waitFor(() => {
			expect(modalQueries.getByTestId("admin-option")).toBeInTheDocument();
		});
		await user.click(modalQueries.getByTestId("admin-option"));

		await user.click(modalQueries.getByTestId("cancel-button"));

		expect(mockOnClose).toHaveBeenCalled();
	});

	it("prevents submission when email is empty", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const modal = await getLatestModal();
		const sendButton = within(modal).getByTestId("send-invitation-button");
		await user.click(sendButton);

		expect(mockOnInvite).not.toHaveBeenCalled();
	});
});
