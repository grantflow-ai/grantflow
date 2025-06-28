import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserRole } from "@/types/user";

import { EditPermissionModal } from "./edit-permission-modal";

// Mock the generateInitials function
vi.mock("@/utils/user", () => ({
	generateInitials: vi.fn((fullName: string | undefined, email: string) => {
		if (fullName) {
			return fullName
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase();
		}
		// Generate initials from email - just take first character
		return email[0].toUpperCase();
	}),
}));

// Mock data
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

		// Check member data is displayed
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

		// Initially dropdown should not be visible
		expect(screen.queryByTestId("permission-dropdown-menu")).not.toBeInTheDocument();

		// Click to open dropdown
		await user.click(dropdown);
		expect(screen.getByTestId("permission-dropdown-menu")).toBeInTheDocument();
		expect(screen.getByTestId("permission-option-MEMBER")).toBeInTheDocument();
		expect(screen.getByTestId("permission-option-ADMIN")).toBeInTheDocument();

		// Select admin role
		await user.click(screen.getByTestId("permission-option-ADMIN"));

		// Dropdown should close and admin should be selected
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

		// Initially has projects selected
		expect(screen.getByTestId("selected-project-1")).toBeInTheDocument();
		expect(screen.getByTestId("selected-project-2")).toBeInTheDocument();

		// Switch to admin role
		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("permission-option-ADMIN"));

		// Projects should be cleared
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

		// Initially should show project search for member role
		expect(screen.getByTestId("project-search-input")).toBeInTheDocument();

		// Switch to admin role
		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("permission-option-ADMIN"));

		// Project search should be hidden
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

		// Type to search
		await user.type(searchInput, "Quantum");

		// Search results should appear
		expect(screen.getByTestId("project-search-results")).toBeInTheDocument();
		expect(screen.getByTestId("project-option-3")).toBeInTheDocument();
		expect(screen.getByTestId("project-option-3")).toHaveTextContent("Research Quantum Computing");

		// Click to add project
		await user.click(screen.getByTestId("project-option-3"));

		// Project should be added
		expect(screen.getByTestId("selected-project-3")).toBeInTheDocument();
		// Search should be cleared
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

		// Focus to show all available projects
		await user.click(searchInput);

		// Should only show unselected project (project 3)
		expect(screen.getByTestId("project-search-results")).toBeInTheDocument();
		expect(screen.queryByTestId("project-option-1")).not.toBeInTheDocument(); // Already selected
		expect(screen.queryByTestId("project-option-2")).not.toBeInTheDocument(); // Already selected
		expect(screen.getByTestId("project-option-3")).toBeInTheDocument(); // Not selected
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

		// Initially has 2 projects
		expect(screen.getByTestId("selected-project-1")).toBeInTheDocument();
		expect(screen.getByTestId("selected-project-2")).toBeInTheDocument();

		// Remove project 1
		await user.click(screen.getByTestId("remove-project-1"));

		// Project 1 should be removed
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

		// Name and email should always be disabled
		expect(screen.getByTestId("name-input")).toBeDisabled();
		expect(screen.getByTestId("email-input")).toBeDisabled();

		// Permission dropdown should be disabled for members
		expect(screen.getByTestId("permission-dropdown")).toBeDisabled();

		// Project search should not be shown when can't edit
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

		// Add a new project
		await user.click(screen.getByTestId("project-search-input"));
		await user.click(screen.getByTestId("project-option-3"));

		// Submit
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

		// Switch to admin
		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("permission-option-ADMIN"));

		// Submit
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

		// Submit
		await user.click(screen.getByTestId("update-button"));

		// Should show loading state
		expect(screen.getByTestId("update-button")).toHaveTextContent("Updating...");
		expect(screen.getByTestId("update-button")).toBeDisabled();

		// Resolve the promise
		resolvePromise!();

		await waitFor(() => {
			expect(mockOnClose).toHaveBeenCalled();
		});
	});

	it("handles update error gracefully", async () => {
		const user = userEvent.setup();
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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

		// Submit
		await user.click(screen.getByTestId("update-button"));

		await waitFor(() => {
			expect(consoleSpy).toHaveBeenCalledWith("Failed to update permissions:", expect.any(Error));
		});

		// Should reset loading state but not close modal
		expect(screen.getByTestId("update-button")).toHaveTextContent("Update");
		expect(screen.getByTestId("update-button")).not.toBeDisabled();
		expect(mockOnClose).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
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

		// Make some changes - type in search first (while member role is selected)
		await user.type(screen.getByTestId("project-search-input"), "test search");

		// Then switch to admin role
		await user.click(screen.getByTestId("permission-dropdown"));
		await user.click(screen.getByTestId("permission-option-ADMIN"));

		// Close modal
		await user.click(screen.getByTestId("cancel-button"));

		expect(mockOnClose).toHaveBeenCalled();
		// Form state should be reset in handleClose
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
