import { ProjectFactory, ProjectMemberFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { getProjectMembers } from "@/actions/project";
import { ProjectSettingsMembers } from "@/components/projects";
import { useUserStore } from "@/stores/user-store";
import type { API } from "@/types/api-types";
import { UserRole } from "@/types/user";

vi.mock("@/actions/project", () => ({
	getProjectMembers: vi.fn(),
}));

vi.mock("@/stores/user-store", () => ({
	useUserStore: vi.fn(),
}));

vi.mock("@/stores/notification-store", () => ({
	useNotificationStore: vi.fn(() => ({
		addNotification: vi.fn(),
	})),
}));

vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
	},
}));

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

vi.mock("../modals/invite-collaborator-modal", () => ({
	InviteCollaboratorModal: ({ isOpen, onClose, onInvite }: any) =>
		isOpen ? (
			<div data-testid="invite-collaborator-modal">
				<button data-testid="mock-close-invite-modal" onClick={onClose} type="button">
					Close
				</button>
				<button
					data-testid="mock-invite-submit"
					onClick={() => onInvite("test@example.com", "collaborator")}
					type="button"
				>
					Invite
				</button>
			</div>
		) : null,
}));

vi.mock("./edit-permission-modal", () => ({
	EditPermissionModal: ({ isOpen, member, onClose, onUpdateRole }: any) =>
		isOpen ? (
			<div data-testid="edit-permission-modal">
				<div data-testid="editing-member-id">{member?.firebaseUid}</div>
				<button data-testid="mock-close-edit-modal" onClick={onClose} type="button">
					Close
				</button>
				<button
					data-testid="mock-update-role"
					onClick={() => onUpdateRole(member.firebaseUid, UserRole.ADMIN, [])}
					type="button"
				>
					Update
				</button>
			</div>
		) : null,
}));

const mockProject = ProjectFactory.build();
const mockUser = {
	displayName: "Test User",
	email: "test@example.com",
	emailVerified: true,
	photoURL: null,
	uid: "test-uid",
};

const mockMembers: API.ListProjectMembers.Http200.ResponseBody = [
	ProjectMemberFactory.build({
		display_name: "Owner User",
		email: "owner@example.com",
		firebase_uid: "firebase-uid-1",
		joined_at: "2025-01-15T10:00:00Z",
		role: UserRole.OWNER,
	}),
	ProjectMemberFactory.build({
		display_name: "Admin User",
		email: "admin@example.com",
		firebase_uid: "firebase-uid-2",
		joined_at: "2025-01-20T10:00:00Z",
		role: UserRole.ADMIN,
	}),
	ProjectMemberFactory.build({
		display_name: "Member User",
		email: "member@example.com",
		firebase_uid: "firebase-uid-3",
		joined_at: "2025-01-25T10:00:00Z",
		role: UserRole.MEMBER,
	}),
];

const renderWithSWR = (component: React.ReactElement) => {
	return render(<SWRConfig value={{ provider: () => new Map() }}>{component}</SWRConfig>);
};

describe("ProjectSettingsMembers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useUserStore).mockReturnValue({ user: mockUser } as any);
	});

	it("does not open invite modal on initial render", async () => {
		const mockInviteHandlerChange = vi.fn();
		vi.mocked(getProjectMembers).mockResolvedValue(mockMembers);

		renderWithSWR(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				onInviteHandlerChange={mockInviteHandlerChange}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		// Wait for members to load
		await waitFor(() => {
			expect(screen.queryByText("Loading members...")).not.toBeInTheDocument();
		});

		// Verify modal is not open
		expect(screen.queryByTestId("invite-collaborator-modal")).not.toBeInTheDocument();
		expect(screen.queryByText("Invite New Member")).not.toBeInTheDocument();

		// Verify handler was registered
		expect(mockInviteHandlerChange).toHaveBeenCalled();
	});

	it("renders the members list with all members", async () => {
		vi.mocked(getProjectMembers).mockResolvedValue(mockMembers);

		renderWithSWR(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		expect(screen.getByText("Loading members...")).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.queryByText("Loading members...")).not.toBeInTheDocument();
		});

		expect(screen.getByTestId("project-settings-members")).toBeInTheDocument();

		// Check member emails are displayed
		expect(screen.getByText("owner@example.com")).toBeInTheDocument();
		expect(screen.getByText("admin@example.com")).toBeInTheDocument();
		expect(screen.getByText("member@example.com")).toBeInTheDocument();

		expect(screen.getByText("Owner User")).toBeInTheDocument();
		expect(screen.getByText("owner@example.com")).toBeInTheDocument();
		expect(screen.getByText("Admin User")).toBeInTheDocument();
		expect(screen.getByText("admin@example.com")).toBeInTheDocument();
		expect(screen.getByText("Member User")).toBeInTheDocument();
		expect(screen.getByText("member@example.com")).toBeInTheDocument();
	});

	it("displays role badges correctly", async () => {
		vi.mocked(getProjectMembers).mockResolvedValue(mockMembers);

		renderWithSWR(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		await waitFor(() => {
			expect(screen.queryByText("Loading members...")).not.toBeInTheDocument();
		});

		expect(screen.getByText("Owner")).toBeInTheDocument();
		expect(screen.getByText("Admin")).toBeInTheDocument();
		expect(screen.getByText("Collaborator")).toBeInTheDocument();
	});

	it("displays project access correctly", async () => {
		vi.mocked(getProjectMembers).mockResolvedValue(mockMembers);

		renderWithSWR(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		await waitFor(() => {
			expect(screen.queryByText("Loading members...")).not.toBeInTheDocument();
		});

		// Verify that the component renders member information
		expect(screen.getByTestId("project-settings-members")).toBeInTheDocument();
		expect(screen.getByText("Owner User")).toBeInTheDocument();
		expect(screen.getByText("Admin User")).toBeInTheDocument();
		expect(screen.getByText("Member User")).toBeInTheDocument();
	});

	it("members cannot modify other members when they don't have permission", async () => {
		vi.mocked(getProjectMembers).mockResolvedValue(mockMembers);

		renderWithSWR(
			<ProjectSettingsMembers
				currentUserRole={UserRole.MEMBER}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		await waitFor(() => {
			expect(screen.queryByText("Loading members...")).not.toBeInTheDocument();
		});

		// Members should not see action buttons (MoreVertical icons) for other members
		const actionButtons = screen.queryAllByRole("button");
		const moreVerticalButtons = actionButtons.filter((button) => button.querySelector("svg"));
		// Should not have action menu buttons since member role can't modify others
		expect(moreVerticalButtons).toHaveLength(0);
	});
});
