import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/types/user";
import { ProjectSettingsAccount } from "./project-settings-account";

// Mock dependencies
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));
vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
	},
}));
vi.mock("@/stores/user-store", () => ({
	useUserStore: vi.fn(),
}));
vi.mock("./delete-account-modal", () => ({
	DeleteAccountModal: vi.fn(() => <div data-testid="mock-delete-account-modal" />),
}));

const mockUpdateProfilePhoto = vi.fn();
const mockDeleteProfilePhoto = vi.fn();
const mockUseUserStore = vi.mocked(await import("@/stores/user-store").then((m) => m.useUserStore));
const MockDeleteAccountModal = vi.mocked(await import("./delete-account-modal").then((m) => m.DeleteAccountModal));

describe("ProjectSettingsAccount", () => {
	const defaultProps = {
		projectId: "project-123",
		userRole: UserRole.COLLABORATOR,
	};

	const mockUser = {
		displayName: "John Doe",
		email: "john.doe@example.com",
		photoURL: "https://example.com/photo.jpg",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseUserStore.mockReturnValue({
			deleteProfilePhoto: mockDeleteProfilePhoto,
			updateProfilePhoto: mockUpdateProfilePhoto,
			user: mockUser,
		});
	});

	it("should render account settings with user information", () => {
		render(<ProjectSettingsAccount {...defaultProps} />);

		expect(screen.getByTestId("project-settings-account")).toBeInTheDocument();
		expect(screen.getByTestId("profile-image-container")).toBeInTheDocument();
		expect(screen.getByTestId("name-input")).toHaveValue("John Doe");
		expect(screen.getByTestId("email-input")).toHaveValue("john.doe@example.com");
		expect(screen.getByTestId("role-badge")).toHaveTextContent("Collaborator");
	});

	it("should display initials when no profile photo", () => {
		mockUseUserStore.mockReturnValue({
			deleteProfilePhoto: mockDeleteProfilePhoto,
			updateProfilePhoto: mockUpdateProfilePhoto,
			user: { ...mockUser, photoURL: null },
		});

		render(<ProjectSettingsAccount {...defaultProps} />);

		expect(screen.getByText("JD")).toBeInTheDocument(); // John Doe initials
	});

	it("should display email initials when no display name", () => {
		mockUseUserStore.mockReturnValue({
			deleteProfilePhoto: mockDeleteProfilePhoto,
			updateProfilePhoto: mockUpdateProfilePhoto,
			user: { ...mockUser, displayName: null, photoURL: null },
		});

		render(<ProjectSettingsAccount {...defaultProps} />);

		expect(screen.getByText("JO")).toBeInTheDocument(); // First two letters of email
	});

	it("should display fallback initial when no user data", () => {
		mockUseUserStore.mockReturnValue({
			deleteProfilePhoto: mockDeleteProfilePhoto,
			updateProfilePhoto: mockUpdateProfilePhoto,
			user: { displayName: null, email: null, photoURL: null },
		});

		render(<ProjectSettingsAccount {...defaultProps} />);

		expect(screen.getByText("U")).toBeInTheDocument(); // Fallback
	});

	it("should handle profile photo upload", async () => {
		const user = userEvent.setup();
		const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

		render(<ProjectSettingsAccount {...defaultProps} />);

		const uploadButton = screen.getByTestId("upload-photo-button");
		await user.click(uploadButton);

		// Simulate file selection
		const fileInput = screen.getByRole("button", { hidden: true });
		if (fileInput.parentElement?.querySelector('input[type="file"]')) {
			const hiddenInput = fileInput.parentElement.querySelector('input[type="file"]')!;
			await user.upload(hiddenInput, file);
		}

		await waitFor(() => {
			expect(mockUpdateProfilePhoto).toHaveBeenCalledWith(file);
		});
	});

	it("should reject invalid file types", async () => {
		const user = userEvent.setup();
		const file = new File(["test"], "test.txt", { type: "text/plain" });

		render(<ProjectSettingsAccount {...defaultProps} />);

		const uploadButton = screen.getByTestId("upload-photo-button");
		await user.click(uploadButton);

		// Simulate file selection with invalid type
		const fileInput = screen.getByRole("button", { hidden: true });
		if (fileInput.parentElement?.querySelector('input[type="file"]')) {
			const hiddenInput = fileInput.parentElement.querySelector('input[type="file"]')!;
			Object.defineProperty(hiddenInput, "files", {
				value: [file],
				writable: false,
			});
			hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
		}

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Please select an image file (PNG, JPG, or GIF)");
		});
		expect(mockUpdateProfilePhoto).not.toHaveBeenCalled();
	});

	it("should reject files over 10MB", async () => {
		const user = userEvent.setup();
		const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.jpg", { type: "image/jpeg" });

		render(<ProjectSettingsAccount {...defaultProps} />);

		const uploadButton = screen.getByTestId("upload-photo-button");
		await user.click(uploadButton);

		// Simulate file selection with large file
		const fileInput = screen.getByRole("button", { hidden: true });
		if (fileInput.parentElement?.querySelector('input[type="file"]')) {
			const hiddenInput = fileInput.parentElement.querySelector('input[type="file"]')!;
			Object.defineProperty(hiddenInput, "files", {
				value: [largeFile],
				writable: false,
			});
			hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
		}

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Please select an image under 10MB");
		});
		expect(mockUpdateProfilePhoto).not.toHaveBeenCalled();
	});

	it("should handle photo upload success", async () => {
		mockUpdateProfilePhoto.mockResolvedValue(undefined);
		const user = userEvent.setup();
		const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

		render(<ProjectSettingsAccount {...defaultProps} />);

		const uploadButton = screen.getByTestId("upload-photo-button");
		await user.click(uploadButton);

		// Simulate file selection
		const fileInput = screen.getByRole("button", { hidden: true });
		if (fileInput.parentElement?.querySelector('input[type="file"]')) {
			const hiddenInput = fileInput.parentElement.querySelector('input[type="file"]')!;
			Object.defineProperty(hiddenInput, "files", {
				value: [file],
				writable: false,
			});
			hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
		}

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith("Profile photo updated successfully");
		});
	});

	it("should handle photo upload errors", async () => {
		mockUpdateProfilePhoto.mockRejectedValue(new Error("Upload failed"));
		const user = userEvent.setup();
		const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

		render(<ProjectSettingsAccount {...defaultProps} />);

		const uploadButton = screen.getByTestId("upload-photo-button");
		await user.click(uploadButton);

		// Simulate file selection
		const fileInput = screen.getByRole("button", { hidden: true });
		if (fileInput.parentElement?.querySelector('input[type="file"]')) {
			const hiddenInput = fileInput.parentElement.querySelector('input[type="file"]')!;
			Object.defineProperty(hiddenInput, "files", {
				value: [file],
				writable: false,
			});
			hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
		}

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to upload profile photo");
		});
	});

	it("should handle photo deletion", async () => {
		mockDeleteProfilePhoto.mockResolvedValue(undefined);
		const user = userEvent.setup();

		render(<ProjectSettingsAccount {...defaultProps} />);

		const deleteButton = screen.getByTestId("delete-photo-button");
		await user.click(deleteButton);

		await waitFor(() => {
			expect(mockDeleteProfilePhoto).toHaveBeenCalled();
			expect(toast.success).toHaveBeenCalledWith("Profile photo removed successfully");
		});
	});

	it("should handle photo deletion errors", async () => {
		mockDeleteProfilePhoto.mockRejectedValue(new Error("Delete failed"));
		const user = userEvent.setup();

		render(<ProjectSettingsAccount {...defaultProps} />);

		const deleteButton = screen.getByTestId("delete-photo-button");
		await user.click(deleteButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to delete profile photo");
		});
	});

	it("should disable delete button when no photo", () => {
		mockUseUserStore.mockReturnValue({
			deleteProfilePhoto: mockDeleteProfilePhoto,
			updateProfilePhoto: mockUpdateProfilePhoto,
			user: { ...mockUser, photoURL: null },
		});

		render(<ProjectSettingsAccount {...defaultProps} />);

		const deleteButton = screen.getByTestId("delete-photo-button");
		expect(deleteButton).toBeDisabled();
	});

	it("should show different role badges", () => {
		const roles = [
			{ label: "Admin", role: UserRole.ADMIN },
			{ label: "Owner", role: UserRole.OWNER },
			{ label: "Collaborator", role: UserRole.COLLABORATOR },
		];

		roles.forEach(({ label, role }) => {
			const { unmount } = render(<ProjectSettingsAccount {...defaultProps} userRole={role} />);
			expect(screen.getByTestId("role-badge")).toHaveTextContent(label);
			unmount();
		});
	});

	it("should show delete account button only for owners", () => {
		render(<ProjectSettingsAccount {...defaultProps} userRole={UserRole.OWNER} />);

		expect(screen.getByTestId("delete-account-button")).toBeInTheDocument();
		expect(screen.getByText("Delete account")).toBeInTheDocument();
	});

	it("should not show delete account button for non-owners", () => {
		render(<ProjectSettingsAccount {...defaultProps} userRole={UserRole.COLLABORATOR} />);

		expect(screen.queryByTestId("delete-account-button")).not.toBeInTheDocument();
	});

	it("should open delete account modal when delete button clicked", async () => {
		const user = userEvent.setup();

		render(<ProjectSettingsAccount {...defaultProps} userRole={UserRole.OWNER} />);

		const deleteButton = screen.getByTestId("delete-account-button");
		await user.click(deleteButton);

		expect(MockDeleteAccountModal).toHaveBeenCalledWith(
			expect.objectContaining({
				isOpen: true,
				onClose: expect.any(Function),
			}),
			expect.anything(),
		);
	});

	it("should update name input value", async () => {
		const user = userEvent.setup();

		render(<ProjectSettingsAccount {...defaultProps} />);

		const nameInput = screen.getByTestId("name-input");
		await user.clear(nameInput);
		await user.type(nameInput, "Jane Smith");

		expect(nameInput).toHaveValue("Jane Smith");
	});

	it("should update email input value", async () => {
		const user = userEvent.setup();

		render(<ProjectSettingsAccount {...defaultProps} />);

		const emailInput = screen.getByTestId("email-input");
		await user.clear(emailInput);
		await user.type(emailInput, "jane.smith@example.com");

		expect(emailInput).toHaveValue("jane.smith@example.com");
	});

	it("should show email info tooltip", async () => {
		const user = userEvent.setup();

		render(<ProjectSettingsAccount {...defaultProps} />);

		const infoButton = screen.getByTestId("email-info-button");
		await user.hover(infoButton);

		await waitFor(() => {
			expect(screen.getByText("The main email address cannot be edited.")).toBeInTheDocument();
		});
	});

	it("should show uploading state during file upload", async () => {
		mockUpdateProfilePhoto.mockImplementation(() => new Promise(() => {})); // Never resolves
		const user = userEvent.setup();
		const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

		render(<ProjectSettingsAccount {...defaultProps} />);

		const uploadButton = screen.getByTestId("upload-photo-button");
		await user.click(uploadButton);

		// Simulate file selection
		const fileInput = screen.getByRole("button", { hidden: true });
		if (fileInput.parentElement?.querySelector('input[type="file"]')) {
			const hiddenInput = fileInput.parentElement.querySelector('input[type="file"]')!;
			Object.defineProperty(hiddenInput, "files", {
				value: [file],
				writable: false,
			});
			hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
		}

		await waitFor(() => {
			expect(screen.getByText("Uploading...")).toBeInTheDocument();
		});
	});
});
