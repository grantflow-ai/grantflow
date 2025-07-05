import { ProjectFactory, ProjectMemberFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { getProjectMembers, removeProjectMember, updateProjectMemberRole } from "@/actions/project";
import { inviteCollaborator } from "@/actions/project-invitation";
import { useUserStore } from "@/stores/user-store";
import type { API } from "@/types/api-types";
import { UserRole } from "@/types/user";

import { ProjectSettingsMembers } from "./project-settings-members";

vi.mock("@/actions/project-invitation", () => ({
	inviteCollaborator: vi.fn(),
}));

vi.mock("@/actions/project", () => ({
	getProjectMembers: vi.fn(),
	removeProjectMember: vi.fn(),
	updateProjectMemberRole: vi.fn(),
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
		expect(screen.getByText("Team Members")).toBeInTheDocument();
		expect(screen.getByText("Manage who has access to this project and their permissions.")).toBeInTheDocument();

		expect(screen.getByTestId("member-row-firebase-uid-1")).toBeInTheDocument();
		expect(screen.getByTestId("member-row-firebase-uid-2")).toBeInTheDocument();
		expect(screen.getByTestId("member-row-firebase-uid-3")).toBeInTheDocument();

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

		const allBadges = screen.getAllByText("All");
		expect(allBadges).toHaveLength(2);

		// Member role shows "No access" since projectAccess is not in the API response
		expect(screen.getByText("No access")).toBeInTheDocument();
	});

	it("displays team statistics correctly", async () => {
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

		expect(screen.getByTestId("total-members-count")).toHaveTextContent("3");
		expect(screen.getByTestId("admins-count")).toHaveTextContent("2");
		expect(screen.getByTestId("collaborators-count")).toHaveTextContent("1");
	});

	it("shows invite button for owners and admins", async () => {
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

		expect(screen.getByTestId("invite-button")).toBeInTheDocument();
	});

	it("hides invite button for members", async () => {
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

		expect(screen.queryByTestId("invite-button")).not.toBeInTheDocument();
	});

	it("opens invite modal when invite button is clicked", async () => {
		const user = userEvent.setup();
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

		await user.click(screen.getByTestId("invite-button"));

		expect(screen.getByTestId("invite-collaborator-modal")).toBeInTheDocument();
	});

	it("handles invite collaborator flow", async () => {
		const user = userEvent.setup();
		vi.mocked(getProjectMembers).mockResolvedValue(mockMembers);
		vi.mocked(inviteCollaborator).mockResolvedValue({ success: true });

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

		await user.click(screen.getByTestId("invite-button"));
		await user.click(screen.getByTestId("mock-invite-submit"));

		await waitFor(() => {
			expect(inviteCollaborator).toHaveBeenCalledWith({
				email: "test@example.com",
				inviterName: mockUser.displayName,
				projectId: mockProject.id,
				projectName: mockProject.name,
				role: "member",
			});
		});
	});

	it("shows action menu for non-owner members when user is owner", async () => {
		const user = userEvent.setup();
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

		expect(screen.queryByTestId("member-action-menu-firebase-uid-1")).not.toBeInTheDocument();
		expect(screen.getByTestId("member-action-menu-firebase-uid-2")).toBeInTheDocument();
		expect(screen.getByTestId("member-action-menu-firebase-uid-3")).toBeInTheDocument();

		await user.click(screen.getByTestId("member-action-menu-firebase-uid-2"));

		expect(screen.getByTestId("member-action-dropdown-firebase-uid-2")).toBeInTheDocument();
		expect(screen.getByTestId("edit-permissions-firebase-uid-2")).toBeInTheDocument();
		expect(screen.getByTestId("remove-member-firebase-uid-2")).toBeInTheDocument();
	});

	it("shows limited action menu for admins", async () => {
		const user = userEvent.setup();
		vi.mocked(getProjectMembers).mockResolvedValue(mockMembers);

		renderWithSWR(
			<ProjectSettingsMembers
				currentUserRole={UserRole.ADMIN}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		await waitFor(() => {
			expect(screen.queryByText("Loading members...")).not.toBeInTheDocument();
		});

		expect(screen.queryByTestId("member-action-menu-firebase-uid-1")).not.toBeInTheDocument();
		expect(screen.getByTestId("member-action-menu-firebase-uid-2")).toBeInTheDocument();
		expect(screen.getByTestId("member-action-menu-firebase-uid-3")).toBeInTheDocument();

		await user.click(screen.getByTestId("member-action-menu-firebase-uid-3"));

		expect(screen.queryByTestId("edit-permissions-firebase-uid-3")).not.toBeInTheDocument();
		expect(screen.getByTestId("remove-member-firebase-uid-3")).toBeInTheDocument();
	});

	it("opens edit permission modal when clicked", async () => {
		const user = userEvent.setup();
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

		await user.click(screen.getByTestId("member-action-menu-firebase-uid-2"));
		await user.click(screen.getByTestId("edit-permissions-firebase-uid-2"));

		expect(screen.getByTestId("edit-permission-modal")).toBeInTheDocument();
		expect(screen.getByTestId("editing-member-id")).toHaveTextContent("firebase-uid-2");
	});

	it("closes action menu when clicking outside", async () => {
		const user = userEvent.setup();
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

		await user.click(screen.getByTestId("member-action-menu-firebase-uid-2"));
		expect(screen.getByTestId("member-action-dropdown-firebase-uid-2")).toBeInTheDocument();

		await user.click(document.body);

		await waitFor(() => {
			expect(screen.queryByTestId("member-action-dropdown-firebase-uid-2")).not.toBeInTheDocument();
		});
	});

	it("displays empty state when no members", async () => {
		vi.mocked(getProjectMembers).mockResolvedValue([]);

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

		expect(screen.getByTestId("empty-state")).toBeInTheDocument();
		expect(screen.getByText("No team members yet.")).toBeInTheDocument();
		expect(screen.getByTestId("invite-first-member-button")).toBeInTheDocument();
	});

	it("handles remove member action", async () => {
		const user = userEvent.setup();
		vi.mocked(getProjectMembers).mockResolvedValue(mockMembers);
		vi.mocked(removeProjectMember).mockResolvedValue();

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

		await user.click(screen.getByTestId("member-action-menu-firebase-uid-3"));
		await user.click(screen.getByTestId("remove-member-firebase-uid-3"));

		await waitFor(() => {
			expect(removeProjectMember).toHaveBeenCalledWith(mockProject.id, "firebase-uid-3");
		});
	});

	it("handles update member role action", async () => {
		const user = userEvent.setup();
		vi.mocked(getProjectMembers).mockResolvedValue(mockMembers);
		vi.mocked(updateProjectMemberRole).mockResolvedValue({} as any);

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

		await user.click(screen.getByTestId("member-action-menu-firebase-uid-2"));
		await user.click(screen.getByTestId("edit-permissions-firebase-uid-2"));
		await user.click(screen.getByTestId("mock-update-role"));

		await waitFor(() => {
			expect(updateProjectMemberRole).toHaveBeenCalledWith(mockProject.id, "firebase-uid-2", {
				role: UserRole.ADMIN,
			});
		});
	});

	it("handles invite error gracefully", async () => {
		const user = userEvent.setup();
		vi.mocked(getProjectMembers).mockResolvedValue(mockMembers);
		vi.mocked(inviteCollaborator).mockResolvedValue({ error: "Email already exists", success: false });

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

		await user.click(screen.getByTestId("invite-button"));
		await user.click(screen.getByTestId("mock-invite-submit"));

		await waitFor(() => {
			expect(inviteCollaborator).toHaveBeenCalled();
		});

		expect(screen.getByTestId("invite-collaborator-modal")).toBeInTheDocument();
	});

	it("handles missing user display name when inviting", async () => {
		const user = userEvent.setup();
		vi.mocked(getProjectMembers).mockResolvedValue(mockMembers);
		vi.mocked(useUserStore).mockReturnValue({ user: { ...mockUser, displayName: undefined } } as any);

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

		await user.click(screen.getByTestId("invite-button"));
		await user.click(screen.getByTestId("mock-invite-submit"));

		expect(inviteCollaborator).not.toHaveBeenCalled();
	});

	it("members cannot see action menus", async () => {
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

		expect(screen.queryByTestId("member-action-menu-firebase-uid-1")).not.toBeInTheDocument();
		expect(screen.queryByTestId("member-action-menu-firebase-uid-2")).not.toBeInTheDocument();
		expect(screen.queryByTestId("member-action-menu-firebase-uid-3")).not.toBeInTheDocument();
	});
});
