import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserRole } from "@/types/user";
import { log } from "@/utils/logger";

import { EditPermissionModal } from "./edit-permission-modal";

vi.mock("@/utils/user", () => ({
	generateInitials: vi.fn((fullName: string | undefined, email: string) => {
		if (fullName) {
			return fullName
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase();
		}

		return email[0].toUpperCase();
	}),
}));

vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

const mockProjects = [
	{ id: "1", name: "Research Neural Networks" },
	{ id: "2", name: "Research Machine Learning" },
	{ id: "3", name: "Research Quantum Computing" },
];

const mockMember = {
	email: "test@example.com",
	firebaseUid: "firebase123",
	fullName: "Test User",
	id: "member123",
	joinedAt: "2024-01-01",
	photoUrl: undefined,
	projectAccess: ["1", "2"],
	role: UserRole.MEMBER,
	status: "active" as const,
};

describe("EditPermissionModal", () => {
	const mockOnClose = vi.fn();
	const mockOnUpdateRole = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders modal content when open with member data", () => {
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		expect(screen.getByTestId("edit-permission-modal")).toBeInTheDocument();
		expect(screen.getByText("Edit Permission")).toBeInTheDocument();
		expect(screen.getByText("Control access and permission levels across research projects.")).toBeInTheDocument();

		expect(screen.getByTestId("name-input")).toHaveValue("Test User");
		expect(screen.getByTestId("email-input")).toHaveValue("test@example.com");
		expect(screen.getByTestId("permission-dropdown")).toHaveTextContent(
			"Collaborator (can access applications within specific project)",
		);
	});

	it("does not render when member is null", () => {
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={null}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		expect(screen.queryByTestId("edit-permission-modal")).not.toBeInTheDocument();
	});

	it("does not render when closed", () => {
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={false}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		expect(screen.queryByTestId("edit-permission-modal")).not.toBeInTheDocument();
	});

	it("displays member's selected projects", () => {
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		expect(screen.getByTestId("selected-project-1")).toBeInTheDocument();
		expect(screen.getByTestId("selected-project-1")).toHaveTextContent("Research Neural Networks");
		expect(screen.getByTestId("selected-project-2")).toBeInTheDocument();
		expect(screen.getByTestId("selected-project-2")).toHaveTextContent("Research Machine Learning");
	});

	it("allows owner to edit permissions", async () => {
		const user = userEvent.setup();
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		const dropdown = screen.getByTestId("permission-dropdown");
		expect(dropdown).not.toBeDisabled();

		await user.click(dropdown);
		expect(screen.getByTestId("permission-dropdown-menu")).toBeInTheDocument();
	});

	it("prevents member from editing owner permissions", () => {
		const ownerMember = { ...mockMember, role: UserRole.OWNER };
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.ADMIN}
				isOpen={true}
				member={ownerMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		const dropdown = screen.getByTestId("permission-dropdown");
		expect(dropdown).toBeDisabled();
		expect(screen.getByTestId("update-button")).toBeDisabled();
	});

	it("allows admin to edit member permissions but not owner", () => {
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.ADMIN}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		const dropdown = screen.getByTestId("permission-dropdown");
		expect(dropdown).not.toBeDisabled();
		expect(screen.getByTestId("update-button")).not.toBeDisabled();
	});

	it("toggles permission dropdown and allows role selection", async () => {
		const user = userEvent.setup();
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		const dropdown = screen.getByTestId("permission-dropdown");

		expect(screen.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();

		await user.click(dropdown);
		expect(screen.getByTestId("permission-dropdown-menu")).toBeInTheDocument();
		expect(screen.getByTestId("permission-option-MEMBER")).toBeInTheDocument();
		expect(screen.getByTestId("permission-option-ADMIN")).toBeInTheDocument();

		await user.click(screen.getByTestId("permission-option-ADMIN"));

		expect(screen.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();
		expect(dropdown).toHaveTextContent("Admin (can access all research projects)");
	});

	it("clears project selection when switching to admin role", async () => {
		const user = userEvent.setup();
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		expect(screen.getByTestId("selected-project-1")).toBeInTheDocument();
		expect(screen.getByTestId("selected-project-2")).toBeInTheDocument();

		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("permission-option-ADMIN"));

		expect(screen.queryByTestId("selected-project-1")).not.toBeInTheDocument();
		expect(screen.queryByTestId("selected-project-2")).not.toBeInTheDocument();
	});

	it("shows project search when member role is selected", () => {
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		expect(screen.getByTestId("project-search-input")).toBeInTheDocument();
		expect(screen.getByText("Research Project Access")).toBeInTheDocument();
	});

	it("hides project search when admin role is selected", async () => {
		const user = userEvent.setup();
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		expect(screen.getByTestId("project-search-input")).toBeInTheDocument();

		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("permission-option-ADMIN"));

		expect(screen.queryByTestId("project-search-input")).not.toBeInTheDocument();
		expect(screen.queryByText("Research Project Access")).not.toBeInTheDocument();
	});

	it("allows searching and adding projects", async () => {
		const user = userEvent.setup();
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={{ ...mockMember, projectAccess: [] }}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		const searchInput = screen.getByTestId("project-search-input");

		await user.type(searchInput, "Quantum");

		expect(screen.getByTestId("project-search-results")).toBeInTheDocument();
		expect(screen.getByTestId("project-option-3")).toBeInTheDocument();
		expect(screen.getByTestId("project-option-3")).toHaveTextContent("Research Quantum Computing");

		await user.click(screen.getByTestId("project-option-3"));

		expect(screen.getByTestId("selected-project-3")).toBeInTheDocument();

		expect(searchInput).toHaveValue("");
	});

	it("filters out already selected projects from search results", async () => {
		const user = userEvent.setup();
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		const searchInput = screen.getByTestId("project-search-input");

		await user.click(searchInput);

		expect(screen.getByTestId("project-search-results")).toBeInTheDocument();
		expect(screen.queryByTestId("project-option-1")).not.toBeInTheDocument();
		expect(screen.queryByTestId("project-option-2")).not.toBeInTheDocument();
		expect(screen.getByTestId("project-option-3")).toBeInTheDocument();
	});

	it("allows removing selected projects", async () => {
		const user = userEvent.setup();
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		expect(screen.getByTestId("selected-project-1")).toBeInTheDocument();
		expect(screen.getByTestId("selected-project-2")).toBeInTheDocument();

		await user.click(screen.getByTestId("remove-project-1"));

		expect(screen.queryByTestId("selected-project-1")).not.toBeInTheDocument();
		expect(screen.getByTestId("selected-project-2")).toBeInTheDocument();
	});

	it("shows warning message when projects are selected", () => {
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		expect(screen.getByText(/Removing research project permission will revoke access/)).toBeInTheDocument();
	});

	it("disables inputs and fields based on edit permissions", () => {
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.MEMBER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		expect(screen.getByTestId("name-input")).toBeDisabled();
		expect(screen.getByTestId("email-input")).toBeDisabled();

		expect(screen.getByTestId("permission-dropdown")).toBeDisabled();

		expect(screen.queryByTestId("project-search-input")).not.toBeInTheDocument();
	});

	it("calls onUpdateRole with correct parameters on submit", async () => {
		const user = userEvent.setup();
		mockOnUpdateRole.mockResolvedValue(undefined);

		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		await user.click(screen.getByTestId("project-search-input"));
		await user.click(screen.getByTestId("project-option-3"));

		await user.click(screen.getByTestId("update-button"));

		expect(mockOnUpdateRole).toHaveBeenCalledWith("member123", UserRole.MEMBER, ["1", "2", "3"]);
	});

	it("calls onUpdateRole without projects for admin role", async () => {
		const user = userEvent.setup();
		mockOnUpdateRole.mockResolvedValue(undefined);

		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("permission-option-ADMIN"));

		await user.click(screen.getByTestId("update-button"));

		expect(mockOnUpdateRole).toHaveBeenCalledWith("member123", UserRole.ADMIN, undefined);
	});

	it("shows loading state during submission", async () => {
		const user = userEvent.setup();
		let resolvePromise: () => void;
		const updatePromise = new Promise<void>((resolve) => {
			resolvePromise = resolve;
		});
		mockOnUpdateRole.mockReturnValue(updatePromise);

		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		await user.click(screen.getByTestId("update-button"));

		expect(screen.getByTestId("update-button")).toHaveTextContent("Updating...");
		expect(screen.getByTestId("update-button")).toBeDisabled();

		resolvePromise!();

		await waitFor(() => {
			expect(mockOnClose).toHaveBeenCalled();
		});
	});

	it("handles update error gracefully", async () => {
		const user = userEvent.setup();
		mockOnUpdateRole.mockRejectedValue(new Error("Update failed"));

		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		await user.click(screen.getByTestId("update-button"));

		await waitFor(() => {
			expect(log.error).toHaveBeenCalledWith("Failed to update permissions:", expect.any(Error));
		});

		expect(screen.getByTestId("update-button")).toHaveTextContent("Update");
		expect(screen.getByTestId("update-button")).not.toBeDisabled();
		expect(mockOnClose).not.toHaveBeenCalled();
	});

	it("calls onClose when cancel button is clicked", async () => {
		const user = userEvent.setup();
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		await user.click(screen.getByTestId("cancel-button"));

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnUpdateRole).not.toHaveBeenCalled();
	});

	it("calls onClose when X button is clicked", async () => {
		const user = userEvent.setup();
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		await user.click(screen.getByTestId("close-button"));

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnUpdateRole).not.toHaveBeenCalled();
	});

	it("resets form state when closing", async () => {
		const user = userEvent.setup();
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		await user.type(screen.getByTestId("project-search-input"), "test search");

		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("permission-option-ADMIN"));

		await user.click(screen.getByTestId("cancel-button"));

		expect(mockOnClose).toHaveBeenCalled();
	});

	it("handles member without fullName by using generateInitials", () => {
		const memberWithoutName = { ...mockMember, fullName: undefined };
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={memberWithoutName}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		// Should display generated initials (T for test@example.com)
		expect(screen.getByTestId("name-input")).toHaveValue("T");
	});

	it("has proper accessibility attributes", () => {
		render(
			<EditPermissionModal
				availableProjects={mockProjects}
				currentUserRole={UserRole.OWNER}
				isOpen={true}
				member={mockMember}
				onClose={mockOnClose}
				onUpdateRole={mockOnUpdateRole}
			/>,
		);

		const dropdown = screen.getByTestId("permission-dropdown");
		expect(dropdown).toHaveAttribute("aria-expanded", "false");
		expect(dropdown).toHaveAttribute("aria-haspopup", "listbox");

		const closeButton = screen.getByTestId("close-button");
		expect(closeButton).toHaveAttribute("aria-label", "Close modal");

		const removeButtons = screen.getAllByRole("button", { name: /Remove Research/ });
		expect(removeButtons).toHaveLength(2);
	});
});
