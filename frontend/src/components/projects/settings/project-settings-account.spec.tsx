import { ProjectFactory } from "::testing/factories";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ProjectSettingsAccount } from "@/components/projects";
import { useUserStore } from "@/stores/user-store";
import { UserRole } from "@/types/user";

vi.mock("@/stores/user-store", () => ({
	useUserStore: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("next/image", () => ({
	default: ({ alt, fill, src, ...props }: any) => <div data-alt={alt} data-fill={fill} data-src={src} {...props} />,
}));

vi.mock("./delete-account-modal", () => ({
	DeleteAccountModal: ({ isOpen, onClose }: any) =>
		isOpen ? (
			<div data-testid="delete-account-modal">
				<button data-testid="mock-close-delete-modal" onClick={onClose} type="button">
					Close
				</button>
			</div>
		) : null,
}));

const mockProject = ProjectFactory.build();
const mockUser = {
	customClaims: null,
	disabled: false,
	displayName: "John Doe",
	email: "john.doe@example.com",
	emailVerified: true,
	phoneNumber: null,
	photoURL: null,
	providerData: [],
	tenantId: null,
	uid: "test-uid",
};

const mockUserWithPhoto = {
	...mockUser,
	photoURL: "https://example.com/photo.jpg",
};

const mockUpdateDisplayName = vi.fn();
const mockUpdateEmail = vi.fn();
const mockUpdateProfilePhoto = vi.fn();
const mockDeleteProfilePhoto = vi.fn();

describe("ProjectSettingsAccount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useUserStore).mockReturnValue({
			deleteProfilePhoto: mockDeleteProfilePhoto,
			updateDisplayName: mockUpdateDisplayName,
			updateEmail: mockUpdateEmail,
			updateProfilePhoto: mockUpdateProfilePhoto,
			user: mockUser,
		} as any);
	});

	it("renders account settings with user information", () => {
		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		expect(screen.getByTestId("project-settings-account")).toBeInTheDocument();
		expect(screen.getByText("Profile Image")).toBeInTheDocument();
		expect(screen.getByText("Name")).toBeInTheDocument();
		expect(screen.getByText("Email address")).toBeInTheDocument();
		expect(screen.getByText("Role")).toBeInTheDocument();

		expect(screen.getByTestId("name-input")).toHaveValue("John Doe");
		expect(screen.getByTestId("email-input")).toHaveValue("john.doe@example.com");
		expect(screen.getByTestId("role-badge")).toHaveTextContent("Collaborator");
	});

	it("displays user initials when no photo URL", () => {
		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		const profileContainer = screen.getByTestId("profile-image-container");
		expect(profileContainer).toHaveTextContent("JD");
	});

	it("displays user photo when photo URL exists", () => {
		vi.mocked(useUserStore).mockReturnValue({
			deleteProfilePhoto: mockDeleteProfilePhoto,
			updateDisplayName: mockUpdateDisplayName,
			updateEmail: mockUpdateEmail,
			updateProfilePhoto: mockUpdateProfilePhoto,
			user: mockUserWithPhoto,
		} as any);

		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		const profileContainer = screen.getByTestId("profile-image-container");
		expect(profileContainer).toBeInTheDocument();
	});

	it("uses email initials when no display name", () => {
		vi.mocked(useUserStore).mockReturnValue({
			deleteProfilePhoto: mockDeleteProfilePhoto,
			updateDisplayName: mockUpdateDisplayName,
			updateEmail: mockUpdateEmail,
			updateProfilePhoto: mockUpdateProfilePhoto,
			user: { ...mockUser, displayName: null },
		} as any);

		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		const profileContainer = screen.getByTestId("profile-image-container");
		expect(profileContainer).toHaveTextContent("JO");
	});

	it("shows email tooltip on hover", async () => {
		const user = userEvent.setup();
		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		const infoButton = screen.getByTestId("email-info-button");

		expect(screen.queryByTestId("email-tooltip")).not.toBeInTheDocument();

		await user.hover(infoButton);
		const tooltip = screen.getByTestId("email-tooltip");
		expect(tooltip).toBeInTheDocument();
		expect(tooltip).toHaveTextContent("Changing your email address requires recent authentication.");
		expect(tooltip).toHaveTextContent("You may need to sign in again.");

		await user.unhover(infoButton);
		expect(screen.queryByTestId("email-tooltip")).not.toBeInTheDocument();
	});

	it("updates name input when typing", async () => {
		const user = userEvent.setup();
		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		const nameInput = screen.getByTestId("name-input");

		await user.clear(nameInput);
		await user.type(nameInput, "Jane Smith");

		expect(nameInput).toHaveValue("Jane Smith");
	});

	it("email input is editable", async () => {
		const user = userEvent.setup();
		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		const emailInput = screen.getByTestId("email-input");
		expect(emailInput).not.toBeDisabled();

		await user.clear(emailInput);
		await user.type(emailInput, "new.email@example.com");

		expect(emailInput).toHaveValue("new.email@example.com");
	});

	it("displays correct role badges", () => {
		const { rerender } = render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);
		expect(screen.getByTestId("role-badge")).toHaveTextContent("Collaborator");

		rerender(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.ADMIN} />);
		expect(screen.getByTestId("role-badge")).toHaveTextContent("Admin");

		rerender(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.OWNER} />);
		expect(screen.getByTestId("role-badge")).toHaveTextContent("Owner");
	});

	it("shows delete account button only for owners", () => {
		const { rerender } = render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);
		expect(screen.queryByTestId("delete-account-button")).not.toBeInTheDocument();

		rerender(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.ADMIN} />);
		expect(screen.queryByTestId("delete-account-button")).not.toBeInTheDocument();

		rerender(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.OWNER} />);
		expect(screen.getByTestId("delete-account-button")).toBeInTheDocument();
	});

	it("opens delete account modal when delete button clicked", async () => {
		const user = userEvent.setup();
		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.OWNER} />);

		const deleteButton = screen.getByTestId("delete-account-button");

		expect(screen.queryByTestId("delete-account-modal")).not.toBeInTheDocument();

		await user.click(deleteButton);
		expect(screen.getByTestId("delete-account-modal")).toBeInTheDocument();

		await user.click(screen.getByTestId("mock-close-delete-modal"));

		await waitFor(() => {
			expect(screen.queryByTestId("delete-account-modal")).not.toBeInTheDocument();
		});
	});

	it("displays upload and delete photo buttons", () => {
		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		expect(screen.getByTestId("upload-photo-button")).toBeInTheDocument();
		expect(screen.getByTestId("upload-photo-button")).toHaveTextContent("Upload");
		expect(screen.getByTestId("delete-photo-button")).toBeInTheDocument();
	});

	it("shows support text for image upload", () => {
		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		expect(screen.getByText("We support PNG's, JPG's, GIF's under 10MB")).toBeInTheDocument();
	});

	it("handles missing user data gracefully", () => {
		vi.mocked(useUserStore).mockReturnValue({
			deleteProfilePhoto: mockDeleteProfilePhoto,
			updateDisplayName: mockUpdateDisplayName,
			updateEmail: mockUpdateEmail,
			updateProfilePhoto: mockUpdateProfilePhoto,
			user: null,
		} as any);

		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		expect(screen.getByTestId("name-input")).toHaveValue("");
		expect(screen.getByTestId("email-input")).toHaveValue("");
		expect(screen.getByTestId("profile-image-container")).toHaveTextContent("U");
	});

	it("uses default role when none provided", () => {
		render(<ProjectSettingsAccount projectId={mockProject.id} />);

		expect(screen.getByTestId("role-badge")).toHaveTextContent("Collaborator");
	});

	// New tests for profile update functionality
	describe("Profile updates", () => {
		it("displays save button", () => {
			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			expect(screen.getByTestId("save-profile-button")).toBeInTheDocument();
			expect(screen.getByTestId("save-profile-button")).toHaveTextContent("Save Changes");
		});

		it("disables save button when no changes made", () => {
			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const saveButton = screen.getByTestId("save-profile-button");
			expect(saveButton).toBeDisabled();
		});

		it("enables save button when name is changed", async () => {
			const user = userEvent.setup();
			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const nameInput = screen.getByTestId("name-input");
			const saveButton = screen.getByTestId("save-profile-button");

			expect(saveButton).toBeDisabled();

			await user.clear(nameInput);
			await user.type(nameInput, "Jane Smith");

			expect(saveButton).not.toBeDisabled();
		});

		it("enables save button when email is changed", async () => {
			const user = userEvent.setup();
			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const emailInput = screen.getByTestId("email-input");
			const saveButton = screen.getByTestId("save-profile-button");

			expect(saveButton).toBeDisabled();

			await user.clear(emailInput);
			await user.type(emailInput, "new.email@example.com");

			expect(saveButton).not.toBeDisabled();
		});

		it("saves profile changes successfully", async () => {
			const user = userEvent.setup();
			mockUpdateDisplayName.mockResolvedValueOnce(undefined);
			mockUpdateEmail.mockResolvedValueOnce(undefined);

			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const nameInput = screen.getByTestId("name-input");
			const emailInput = screen.getByTestId("email-input");
			const saveButton = screen.getByTestId("save-profile-button");

			await user.clear(nameInput);
			await user.type(nameInput, "Jane Smith");
			await user.clear(emailInput);
			await user.type(emailInput, "jane.smith@example.com");

			await user.click(saveButton);

			await waitFor(() => {
				expect(mockUpdateDisplayName).toHaveBeenCalledWith("Jane Smith");
				expect(mockUpdateEmail).toHaveBeenCalledWith("jane.smith@example.com");
				expect(toast.success).toHaveBeenCalledWith("Profile updated successfully");
			});
		});

		it("only updates changed fields", async () => {
			const user = userEvent.setup();
			mockUpdateDisplayName.mockResolvedValueOnce(undefined);

			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const nameInput = screen.getByTestId("name-input");
			const saveButton = screen.getByTestId("save-profile-button");

			await user.clear(nameInput);
			await user.type(nameInput, "Jane Smith");

			await user.click(saveButton);

			await waitFor(() => {
				expect(mockUpdateDisplayName).toHaveBeenCalledWith("Jane Smith");
				expect(mockUpdateEmail).not.toHaveBeenCalled();
				expect(toast.success).toHaveBeenCalledWith("Profile updated successfully");
			});
		});

		it("handles profile update errors", async () => {
			const user = userEvent.setup();
			const error = new Error("Update failed");
			mockUpdateDisplayName.mockRejectedValueOnce(error);

			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const nameInput = screen.getByTestId("name-input");
			const saveButton = screen.getByTestId("save-profile-button");

			await user.clear(nameInput);
			await user.type(nameInput, "Jane Smith");

			await user.click(saveButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Update failed");
			});
		});

		it("handles re-authentication required error", async () => {
			const user = userEvent.setup();
			const error = new Error("auth/requires-recent-login");
			mockUpdateEmail.mockRejectedValueOnce(error);

			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const emailInput = screen.getByTestId("email-input");
			const saveButton = screen.getByTestId("save-profile-button");

			await user.clear(emailInput);
			await user.type(emailInput, "new.email@example.com");

			await user.click(saveButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Please sign in again to update your email address");
			});
		});
	});

	describe("Photo upload", () => {
		it("handles photo upload successfully", async () => {
			const user = userEvent.setup();
			const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
			mockUpdateProfilePhoto.mockResolvedValueOnce(undefined);

			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const fileInput = document.querySelector('input[type="file"]');
			if (!fileInput) throw new Error("File input not found");

			await user.upload(fileInput as HTMLInputElement, mockFile);

			await waitFor(() => {
				expect(mockUpdateProfilePhoto).toHaveBeenCalledWith(mockFile);
				expect(toast.success).toHaveBeenCalledWith("Profile photo updated successfully");
			});
		});

		it("validates file type", async () => {
			const mockFile = new File(["test"], "test.txt", { type: "text/plain" });

			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const fileInput = document.querySelector('input[type="file"]');
			if (!fileInput) throw new Error("File input not found");

			fireEvent.change(fileInput, { target: { files: [mockFile] } });

			await waitFor(() => {
				expect(mockUpdateProfilePhoto).not.toHaveBeenCalled();
				expect(toast.error).toHaveBeenCalledWith("Please select an image file (PNG, JPG, or GIF)");
			});
		});

		it("validates file size", async () => {
			const user = userEvent.setup();
			const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.jpg", { type: "image/jpeg" });

			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const fileInput = document.querySelector('input[type="file"]');
			if (!fileInput) throw new Error("File input not found");

			await user.upload(fileInput as HTMLInputElement, largeFile);

			await waitFor(() => {
				expect(mockUpdateProfilePhoto).not.toHaveBeenCalled();
				expect(toast.error).toHaveBeenCalledWith("Please select an image under 10MB");
			});
		});

		it("handles photo upload error", async () => {
			const user = userEvent.setup();
			const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
			const error = new Error("Upload failed");
			mockUpdateProfilePhoto.mockRejectedValueOnce(error);

			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const fileInput = document.querySelector('input[type="file"]');
			if (!fileInput) throw new Error("File input not found");

			await user.upload(fileInput as HTMLInputElement, mockFile);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Failed to upload profile photo");
			});
		});

		it("disables upload button during upload", async () => {
			const user = userEvent.setup();
			const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
			let resolveUpload: () => void;
			const uploadPromise = new Promise<void>((resolve) => {
				resolveUpload = resolve;
			});
			mockUpdateProfilePhoto.mockReturnValueOnce(uploadPromise);

			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const uploadButton = screen.getByTestId("upload-photo-button");
			const fileInput = document.querySelector('input[type="file"]');
			if (!fileInput) throw new Error("File input not found");

			expect(uploadButton).toHaveTextContent("Upload");

			await user.upload(fileInput as HTMLInputElement, mockFile);

			expect(uploadButton).toHaveTextContent("Uploading...");
			expect(uploadButton).toBeDisabled();

			resolveUpload!();

			await waitFor(() => {
				expect(uploadButton).toHaveTextContent("Upload");
				expect(uploadButton).not.toBeDisabled();
			});
		});
	});

	describe("Photo deletion", () => {
		beforeEach(() => {
			vi.mocked(useUserStore).mockReturnValue({
				deleteProfilePhoto: mockDeleteProfilePhoto,
				updateDisplayName: mockUpdateDisplayName,
				updateEmail: mockUpdateEmail,
				updateProfilePhoto: mockUpdateProfilePhoto,
				user: mockUserWithPhoto,
			} as any);
		});

		it("handles photo deletion successfully", async () => {
			const user = userEvent.setup();
			mockDeleteProfilePhoto.mockResolvedValueOnce(undefined);

			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const deleteButton = screen.getByTestId("delete-photo-button");
			await user.click(deleteButton);

			await waitFor(() => {
				expect(mockDeleteProfilePhoto).toHaveBeenCalled();
				expect(toast.success).toHaveBeenCalledWith("Profile photo removed successfully");
			});
		});

		it("handles photo deletion error", async () => {
			const user = userEvent.setup();
			const error = new Error("Delete failed");
			mockDeleteProfilePhoto.mockRejectedValueOnce(error);

			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const deleteButton = screen.getByTestId("delete-photo-button");
			await user.click(deleteButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Failed to delete profile photo");
			});
		});

		it("disables delete button when no photo exists", () => {
			vi.mocked(useUserStore).mockReturnValue({
				deleteProfilePhoto: mockDeleteProfilePhoto,
				updateDisplayName: mockUpdateDisplayName,
				updateEmail: mockUpdateEmail,
				updateProfilePhoto: mockUpdateProfilePhoto,
				user: mockUser,
			} as any);

			render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

			const deleteButton = screen.getByTestId("delete-photo-button");
			expect(deleteButton).toBeDisabled();
		});
	});
});
