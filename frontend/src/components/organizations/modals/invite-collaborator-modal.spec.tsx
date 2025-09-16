import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InviteCollaboratorModal } from "./invite-collaborator-modal";

const getLatestModal = async () => {
	const modals = await screen.findAllByTestId("invite-collaborator-modal");
	return modals.at(-1)!;
};

describe.sequential("InviteCollaboratorModal", () => {
	const mockOnClose = vi.fn();
	const mockOnInvite = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();

		vi.restoreAllMocks();
	});

	it("renders modal content when open", async () => {
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

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
		render(<InviteCollaboratorModal isOpen={false} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(screen.queryByText("Invite New Member")).not.toBeInTheDocument();
	});

	it("allows user to enter email address", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

		const modal = await getLatestModal();
		const emailInput = within(modal).getByTestId("email-input");

		await user.type(emailInput, "test@example.com");

		await waitFor(() => {
			expect(emailInput).toHaveValue("test@example.com");
		});
	});

	it("defaults to collaborator permission", async () => {
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

		const modal = await getLatestModal();
		const dropdown = within(modal).getByTestId("permission-dropdown");
		expect(dropdown).toHaveTextContent("Select a role (e.g., Admin, Editor, Collaborator)");
	});

	it("toggles permission dropdown when clicked", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);
		const dropdown = modalQueries.getByTestId("permission-dropdown");

		expect(modalQueries.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();

		await user.click(dropdown);

		await waitFor(() => {
			expect(modalQueries.getByTestId("permission-dropdown-menu")).toBeInTheDocument();
		});

		expect(modalQueries.getByTestId("admin-option")).toBeInTheDocument();
		expect(modalQueries.getByTestId("collaborator-option")).toBeInTheDocument();

		await user.click(dropdown);

		await waitFor(() => {
			expect(modalQueries.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();
		});
	});

	it("allows user to select admin permission", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);
		const dropdown = modalQueries.getByTestId("permission-dropdown");

		await user.click(dropdown);

		await waitFor(() => {
			expect(modalQueries.getByTestId("admin-option")).toBeInTheDocument();
		});

		await user.click(modalQueries.getByTestId("admin-option"));

		await waitFor(() => {
			expect(dropdown).toHaveTextContent("ADMIN");
			expect(modalQueries.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();
		});
	});

	it("allows user to select collaborator permission", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);
		const dropdown = modalQueries.getByTestId("permission-dropdown");

		await user.click(dropdown);
		await waitFor(() => {
			expect(modalQueries.getByTestId("admin-option")).toBeInTheDocument();
		});
		await user.click(modalQueries.getByTestId("admin-option"));

		await user.click(dropdown);
		await waitFor(() => {
			expect(modalQueries.getByTestId("collaborator-option")).toBeInTheDocument();
		});
		await user.click(modalQueries.getByTestId("collaborator-option"));

		await waitFor(() => {
			expect(dropdown).toHaveTextContent("COLLABORATOR");
			expect(modalQueries.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();
		});
	});

	it("disables send button when email is empty", async () => {
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

		const modal = await getLatestModal();
		const sendButton = within(modal).getByTestId("send-invitation-button");
		expect(sendButton).toBeDisabled();
	});

	it("enables send button when email is provided", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);
		const emailInput = modalQueries.getByTestId("email-input");
		const sendButton = modalQueries.getByTestId("send-invitation-button");
		const dropdown = modalQueries.getByTestId("permission-dropdown");

		await user.type(emailInput, "test@example.com");

		await user.click(dropdown);
		await waitFor(() => {
			expect(modalQueries.getByTestId("collaborator-option")).toBeInTheDocument();
		});
		await user.click(modalQueries.getByTestId("collaborator-option"));

		await waitFor(() => {
			expect(sendButton).not.toBeDisabled();
		});
	});

	it("calls onInvite with correct parameters when form is submitted", async () => {
		const user = userEvent.setup();
		mockOnInvite.mockResolvedValue(undefined);

		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

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
			expect(mockOnInvite).toHaveBeenCalledWith({
				email: "test@example.com",
				hasAllProjectsAccess: true,
				projectIds: [],
				role: "ADMIN",
			});
		});
	});

	it("calls onClose after successful invitation", async () => {
		const user = userEvent.setup();
		const mockOnInvite = vi.fn().mockResolvedValue(undefined);
		const mockOnClose = vi.fn();
		const mockProjects = [{ id: "1", name: "Project 1" }];

		render(
			<InviteCollaboratorModal
				isOpen={true}
				onClose={mockOnClose}
				onInvite={mockOnInvite}
				projects={mockProjects}
			/>,
		);

		const modal = await getLatestModal();
		const modalQueries = within(modal);

		await user.type(modalQueries.getByTestId("email-input"), "test@example.com");

		await user.click(modalQueries.getByTestId("permission-dropdown"));
		await user.click(await modalQueries.findByText("Collaborator"));

		await user.click(modalQueries.getByTestId("project-access-dropdown"));
		await user.click(await modalQueries.findByText("Project 1"));

		await user.click(modalQueries.getByTestId("send-invitation-button"));

		await waitFor(() => {
			expect(mockOnClose).toHaveBeenCalledTimes(1);
		});
	});

	it("resets form after successful submission", async () => {
		const user = userEvent.setup();
		mockOnInvite.mockResolvedValue(undefined);

		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

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

		expect(mockOnInvite).toHaveBeenCalledWith({
			email: "test@example.com",
			hasAllProjectsAccess: true,
			projectIds: [],
			role: "ADMIN",
		});
	});

	it("shows loading state during submission", async () => {
		const user = userEvent.setup();
		const mockOnInvite = vi.fn().mockReturnValue(new Promise(() => {})); // Never resolves
		const mockOnClose = vi.fn();
		const mockProjects = [{ id: "1", name: "Project 1" }];

		render(
			<InviteCollaboratorModal
				isOpen={true}
				onClose={mockOnClose}
				onInvite={mockOnInvite}
				projects={mockProjects}
			/>,
		);

		const modal = await getLatestModal();
		const modalQueries = within(modal);

		await user.type(modalQueries.getByTestId("email-input"), "test@example.com");

		await user.click(modalQueries.getByTestId("permission-dropdown"));
		await user.click(await modalQueries.findByText("Collaborator"));

		await user.click(modalQueries.getByTestId("project-access-dropdown"));
		await user.click(await modalQueries.findByText("Project 1"));

		const sendButton = modalQueries.getByTestId("send-invitation-button");
		await user.click(sendButton);

		await waitFor(() => {
			expect(sendButton).toBeDisabled();
		});

		expect(modalQueries.getByText("Inviting...")).toBeInTheDocument();
	});

	it("handles invitation error gracefully", async () => {
		const user = userEvent.setup();
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		mockOnInvite.mockRejectedValue(new Error("Invitation failed"));

		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

		const modal = await getLatestModal();
		const modalQueries = within(modal);

		const emailInput = modalQueries.getByTestId("email-input");
		await user.type(emailInput, "test@example.com");

		const dropdown = modalQueries.getByTestId("permission-dropdown");
		await user.click(dropdown);
		await waitFor(() => {
			expect(modalQueries.getByTestId("collaborator-option")).toBeInTheDocument();
		});
		await user.click(modalQueries.getByTestId("collaborator-option"));

		const sendButton = modalQueries.getByTestId("send-invitation-button");

		expect(sendButton).not.toBeDisabled();

		await user.click(sendButton);

		await waitFor(() => {
			expect(sendButton).not.toBeDisabled();
		});

		expect(mockOnClose).not.toHaveBeenCalled();

		expect(emailInput).toHaveValue("test@example.com");
		expect(dropdown).toHaveTextContent("COLLABORATOR");

		consoleErrorSpy.mockRestore();
	});

	it("calls onClose when cancel button is clicked", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

		const modal = await getLatestModal();
		const cancelButton = within(modal).getByTestId("cancel-button");
		await user.click(cancelButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnInvite).not.toHaveBeenCalled();
	});

	it("calls onClose when X button is clicked", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

		const modal = await getLatestModal();
		const closeButton = within(modal).getByRole("button", { name: "Close" });
		await user.click(closeButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnInvite).not.toHaveBeenCalled();
	});

	it("resets form when modal is closed", async () => {
		const user = userEvent.setup();
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

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
		render(<InviteCollaboratorModal isOpen={true} onClose={mockOnClose} onInvite={mockOnInvite} projects={[]} />);

		const modal = await getLatestModal();
		const sendButton = within(modal).getByTestId("send-invitation-button");
		await user.click(sendButton);

		expect(mockOnInvite).not.toHaveBeenCalled();
	});
});
