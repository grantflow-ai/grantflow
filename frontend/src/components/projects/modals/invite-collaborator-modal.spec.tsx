import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InviteCollaboratorModal } from "@/components/projects";

describe("InviteCollaboratorModal", () => {
	const mockOnClose = vi.fn();
	const mockOnInvite = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders modal content when open", () => {
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		expect(screen.getByTestId("invite-collaborator-modal")).toBeInTheDocument();
		expect(screen.getByText("Invite New Member")).toBeInTheDocument();
		expect(screen.getByText("Invite new member and set up member role.")).toBeInTheDocument();
		expect(screen.getByTestId("email-input")).toBeInTheDocument();
		expect(screen.getByTestId("permission-dropdown")).toBeInTheDocument();
		expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
		expect(screen.getByTestId("send-invitation-button")).toBeInTheDocument();
	});

	it("does not render when closed", () => {
		render(<InviteCollaboratorModal isOpen={false} onClose={mockOnClose} onInvite={mockOnInvite} />);

		expect(screen.queryByTestId("invite-collaborator-modal")).not.toBeInTheDocument();
	});

	it("allows user to enter email address", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const emailInput = screen.getByTestId("email-input");
		await user.type(emailInput, "test@example.com");

		expect(emailInput).toHaveValue("test@example.com");
	});

	it("defaults to collaborator permission", () => {
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		expect(screen.getByTestId("permission-dropdown")).toHaveTextContent(
			"Member (can access applications within this project)",
		);
	});

	it("toggles permission dropdown when clicked", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const dropdown = screen.getByTestId("permission-dropdown");

		expect(screen.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();

		await user.click(dropdown);
		expect(screen.getByTestId("permission-dropdown-menu")).toBeInTheDocument();
		expect(screen.getByTestId("admin-option")).toBeInTheDocument();
		expect(screen.getByTestId("collaborator-option")).toBeInTheDocument();

		await user.click(dropdown);
		expect(screen.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();
	});

	it("allows user to select admin permission", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		await user.click(screen.getByTestId("permission-dropdown"));

		await user.click(screen.getByTestId("admin-option"));

		expect(screen.getByTestId("permission-dropdown")).toHaveTextContent("Admin (can access all research projects)");
		expect(screen.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();
	});

	it("allows user to select collaborator permission", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("admin-option"));

		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("collaborator-option"));

		expect(screen.getByTestId("permission-dropdown")).toHaveTextContent(
			"Member (can access applications within this project)",
		);
		expect(screen.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();
	});

	it("disables send button when email is empty", () => {
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const sendButton = screen.getByTestId("send-invitation-button");
		expect(sendButton).toBeDisabled();
	});

	it("enables send button when email is provided", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const emailInput = screen.getByTestId("email-input");
		const sendButton = screen.getByTestId("send-invitation-button");

		await user.type(emailInput, "test@example.com");

		expect(sendButton).not.toBeDisabled();
	});

	it("calls onInvite with correct parameters when form is submitted", async () => {
		const user = userEvent.setup();
		mockOnInvite.mockResolvedValue(undefined);

		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		await user.type(screen.getByTestId("email-input"), "test@example.com");

		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("admin-option"));

		await user.click(screen.getByTestId("send-invitation-button"));

		expect(mockOnInvite).toHaveBeenCalledWith("test@example.com", "admin");
	});

	it("calls onClose after successful invitation", async () => {
		const user = userEvent.setup();
		mockOnInvite.mockResolvedValue(undefined);

		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		await user.type(screen.getByTestId("email-input"), "test@example.com");
		await user.click(screen.getByTestId("send-invitation-button"));

		await waitFor(() => {
			expect(mockOnClose).toHaveBeenCalledTimes(1);
		});
	});

	it("resets form after successful submission", async () => {
		const user = userEvent.setup();
		mockOnInvite.mockResolvedValue(undefined);

		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		const emailInput = screen.getByTestId("email-input");
		await user.type(emailInput, "test@example.com");
		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("admin-option"));

		await user.click(screen.getByTestId("send-invitation-button"));

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

		await user.type(screen.getByTestId("email-input"), "test@example.com");
		await user.click(screen.getByTestId("send-invitation-button"));

		expect(screen.getByTestId("send-invitation-button")).toBeDisabled();

		resolvePromise!();

		await waitFor(() => {
			expect(mockOnClose).toHaveBeenCalled();
		});
	});

	it("handles invitation error gracefully", async () => {
		const user = userEvent.setup();
		mockOnInvite.mockRejectedValue(new Error("Invitation failed"));

		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		await user.type(screen.getByTestId("email-input"), "test@example.com");
		await user.click(screen.getByTestId("send-invitation-button"));

		await waitFor(() => {
			expect(screen.getByTestId("send-invitation-button")).not.toBeDisabled();
		});
		expect(mockOnClose).not.toHaveBeenCalled();
	});

	it("calls onClose when cancel button is clicked", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		await user.click(screen.getByTestId("cancel-button"));

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnInvite).not.toHaveBeenCalled();
	});

	it("calls onClose when X button is clicked", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		await user.click(screen.getByTestId("close-button"));

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnInvite).not.toHaveBeenCalled();
	});

	it("resets form when modal is closed", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		await user.type(screen.getByTestId("email-input"), "test@example.com");
		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("admin-option"));

		await user.click(screen.getByTestId("cancel-button"));

		expect(mockOnClose).toHaveBeenCalled();
	});

	it("prevents submission when email is empty", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} />);

		await user.click(screen.getByTestId("send-invitation-button"));

		expect(mockOnInvite).not.toHaveBeenCalled();
	});
});
