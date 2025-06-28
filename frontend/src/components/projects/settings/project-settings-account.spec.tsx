import { ProjectFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUserStore } from "@/stores/user-store";
import { UserRole } from "@/types/user";

import { ProjectSettingsAccount } from "./project-settings-account";

// Mock dependencies
vi.mock("@/stores/user-store", () => ({
	useUserStore: vi.fn(),
}));

// Mock next/image
vi.mock("next/image", () => ({
	default: ({ alt, fill, src, ...props }: any) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img alt={alt} data-fill={fill} src={src} {...props} />
	),
}));

// Mock DeleteAccountModal
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
	displayName: "John Doe",
	email: "john.doe@example.com",
	emailVerified: true,
	photoURL: null,
	uid: "test-uid",
};

const mockUserWithPhoto = {
	...mockUser,
	photoURL: "https://example.com/photo.jpg",
};

describe("ProjectSettingsAccount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useUserStore).mockReturnValue({ user: mockUser } as any);
	});

	it("renders account settings with user information", () => {
		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		expect(screen.getByTestId("project-settings-account")).toBeInTheDocument();
		expect(screen.getByText("Profile Image")).toBeInTheDocument();
		expect(screen.getByText("Name")).toBeInTheDocument();
		expect(screen.getByText("Email address")).toBeInTheDocument();
		expect(screen.getByText("Role")).toBeInTheDocument();

		// Check user data is displayed
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
		vi.mocked(useUserStore).mockReturnValue({ user: mockUserWithPhoto } as any);

		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		const profileImage = screen.getByAltText("Profile");
		expect(profileImage).toBeInTheDocument();
		expect(profileImage).toHaveAttribute("src", mockUserWithPhoto.photoURL);
	});

	it("uses email initials when no display name", () => {
		vi.mocked(useUserStore).mockReturnValue({
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

		// Initially no tooltip
		expect(screen.queryByTestId("email-tooltip")).not.toBeInTheDocument();

		// Hover to show tooltip
		await user.hover(infoButton);
		const tooltip = screen.getByTestId("email-tooltip");
		expect(tooltip).toBeInTheDocument();
		expect(tooltip).toHaveTextContent("The main email address cannot be edited.");
		expect(tooltip).toHaveTextContent("To change it, please contact our support team.");

		// Unhover to hide tooltip
		await user.unhover(infoButton);
		expect(screen.queryByTestId("email-tooltip")).not.toBeInTheDocument();
	});

	it("updates name input when typing", async () => {
		const user = userEvent.setup();
		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		const nameInput = screen.getByTestId("name-input");

		// Clear and type new name
		await user.clear(nameInput);
		await user.type(nameInput, "Jane Smith");

		expect(nameInput).toHaveValue("Jane Smith");
	});

	it("email input is disabled", () => {
		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		const emailInput = screen.getByTestId("email-input");
		expect(emailInput).toBeDisabled();
		expect(emailInput).toHaveClass("cursor-not-allowed");
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

		// Initially no modal
		expect(screen.queryByTestId("delete-account-modal")).not.toBeInTheDocument();

		// Click to open modal
		await user.click(deleteButton);
		expect(screen.getByTestId("delete-account-modal")).toBeInTheDocument();

		// Click close button
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
		vi.mocked(useUserStore).mockReturnValue({ user: null } as any);

		render(<ProjectSettingsAccount projectId={mockProject.id} userRole={UserRole.MEMBER} />);

		expect(screen.getByTestId("name-input")).toHaveValue("");
		expect(screen.getByTestId("email-input")).toHaveValue("Email@address.com");
		expect(screen.getByTestId("profile-image-container")).toHaveTextContent("U");
	});

	it("uses default role when none provided", () => {
		render(<ProjectSettingsAccount projectId={mockProject.id} />);

		expect(screen.getByTestId("role-badge")).toHaveTextContent("Collaborator");
	});
});