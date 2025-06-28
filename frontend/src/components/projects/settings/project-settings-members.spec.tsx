import { ProjectFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { inviteCollaborator } from "@/actions/project-invitation";
import { useUserStore } from "@/stores/user-store";
import { UserRole } from "@/types/user";

import { ProjectSettingsMembers } from "./project-settings-members";


vi.mock("@/actions/project-invitation", () => ({
	inviteCollaborator: vi.fn(),
}));

vi.mock("@/stores/user-store", () => ({
	useUserStore: vi.fn(),
}));

vi.mock("@/utils/logging", () => ({
	logTrace: vi.fn(),
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
				<div data-testid="editing-member-id">{member?.id}</div>
				<button data-testid="mock-close-edit-modal" onClick={onClose} type="button">
					Close
				</button>
				<button
					data-testid="mock-update-role"
					onClick={() => onUpdateRole(member.id, UserRole.ADMIN, [])}
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

const mockMembers = [
	{
		email: "owner@example.com",
		firebaseUid: "firebase-uid-1",
		fullName: "Owner User",
		id: "1",
		joinedAt: "2025-01-15T10:00:00Z",
		projectAccess: [],
		role: UserRole.OWNER,
		status: "active" as const,
	},
	{
		email: "admin@example.com",
		firebaseUid: "firebase-uid-2",
		fullName: "Admin User",
		id: "2",
		joinedAt: "2025-01-20T10:00:00Z",
		projectAccess: [],
		role: UserRole.ADMIN,
		status: "active" as const,
	},
	{
		email: "member@example.com",
		firebaseUid: "firebase-uid-3",
		fullName: "Member User",
		id: "3",
		joinedAt: "2025-01-25T10:00:00Z",
		projectAccess: ["app1", "app2", "app3", "app4"],
		role: UserRole.MEMBER,
		status: "active" as const,
	},
];

describe("ProjectSettingsMembers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useUserStore).mockReturnValue({ user: mockUser } as any);
	});

	it("renders the members list with all members", () => {
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		expect(screen.getByTestId("project-settings-members")).toBeInTheDocument();
		expect(screen.getByText("Team Members")).toBeInTheDocument();
		expect(screen.getByText("Manage who has access to this project and their permissions.")).toBeInTheDocument();

		
		expect(screen.getByTestId("member-row-1")).toBeInTheDocument();
		expect(screen.getByTestId("member-row-2")).toBeInTheDocument();
		expect(screen.getByTestId("member-row-3")).toBeInTheDocument();

		
		expect(screen.getByText("Owner User")).toBeInTheDocument();
		expect(screen.getByText("owner@example.com")).toBeInTheDocument();
		expect(screen.getByText("Admin User")).toBeInTheDocument();
		expect(screen.getByText("admin@example.com")).toBeInTheDocument();
		expect(screen.getByText("Member User")).toBeInTheDocument();
		expect(screen.getByText("member@example.com")).toBeInTheDocument();
	});

	it("displays role badges correctly", () => {
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		expect(screen.getByText("Owner")).toBeInTheDocument();
		expect(screen.getByText("Admin")).toBeInTheDocument();
		expect(screen.getByText("Collaborator")).toBeInTheDocument();
	});

	it("displays project access correctly", () => {
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		
		const allBadges = screen.getAllByText("All");
		expect(allBadges).toHaveLength(2);

		
		expect(screen.getByText("Application 1")).toBeInTheDocument();
		expect(screen.getByText("Application 2")).toBeInTheDocument();
		expect(screen.getByText("Application 3")).toBeInTheDocument();
		expect(screen.getByText("Application 4")).toBeInTheDocument();
	});

	it("displays team statistics correctly", () => {
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		expect(screen.getByTestId("total-members-count")).toHaveTextContent("3");
		expect(screen.getByTestId("admins-count")).toHaveTextContent("2"); 
		expect(screen.getByTestId("collaborators-count")).toHaveTextContent("1");
	});

	it("shows invite button for owners and admins", () => {
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		expect(screen.getByTestId("invite-button")).toBeInTheDocument();
	});

	it("hides invite button for members", () => {
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.MEMBER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		expect(screen.queryByTestId("invite-button")).not.toBeInTheDocument();
	});

	it("opens invite modal when invite button is clicked", async () => {
		const user = userEvent.setup();
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		await user.click(screen.getByTestId("invite-button"));

		expect(screen.getByTestId("invite-collaborator-modal")).toBeInTheDocument();
	});

	it("handles invite collaborator flow", async () => {
		const user = userEvent.setup();
		vi.mocked(inviteCollaborator).mockResolvedValue({ success: true });

		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

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
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		
		expect(screen.queryByTestId("member-action-menu-1")).not.toBeInTheDocument(); 
		expect(screen.getByTestId("member-action-menu-2")).toBeInTheDocument(); 
		expect(screen.getByTestId("member-action-menu-3")).toBeInTheDocument(); 

		
		await user.click(screen.getByTestId("member-action-menu-2"));

		expect(screen.getByTestId("member-action-dropdown-2")).toBeInTheDocument();
		expect(screen.getByTestId("edit-permissions-2")).toBeInTheDocument();
		expect(screen.getByTestId("remove-member-2")).toBeInTheDocument();
	});

	it("shows limited action menu for admins", async () => {
		const user = userEvent.setup();
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.ADMIN}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		
		expect(screen.queryByTestId("member-action-menu-1")).not.toBeInTheDocument(); 
		expect(screen.getByTestId("member-action-menu-2")).toBeInTheDocument(); 
		expect(screen.getByTestId("member-action-menu-3")).toBeInTheDocument(); 

		
		await user.click(screen.getByTestId("member-action-menu-3"));

		
		expect(screen.queryByTestId("edit-permissions-3")).not.toBeInTheDocument();
		expect(screen.getByTestId("remove-member-3")).toBeInTheDocument();
	});

	it("opens edit permission modal when clicked", async () => {
		const user = userEvent.setup();
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		
		await user.click(screen.getByTestId("member-action-menu-2"));
		await user.click(screen.getByTestId("edit-permissions-2"));

		expect(screen.getByTestId("edit-permission-modal")).toBeInTheDocument();
		expect(screen.getByTestId("editing-member-id")).toHaveTextContent("2");
	});

	it("closes action menu when clicking outside", async () => {
		const user = userEvent.setup();
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		
		await user.click(screen.getByTestId("member-action-menu-2"));
		expect(screen.getByTestId("member-action-dropdown-2")).toBeInTheDocument();

		
		await user.click(document.body);

		await waitFor(() => {
			expect(screen.queryByTestId("member-action-dropdown-2")).not.toBeInTheDocument();
		});
	});

	it("displays empty state when no members", () => {
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={[]}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		expect(screen.getByTestId("empty-state")).toBeInTheDocument();
		expect(screen.getByText("No team members yet.")).toBeInTheDocument();
		expect(screen.getByTestId("invite-first-member-button")).toBeInTheDocument();
	});

	it("handles project access with more than 4 applications", () => {
		const memberWithManyApps = {
			...mockMembers[2],
			projectAccess: ["app1", "app2", "app3", "app4", "app5", "app6"],
		};

		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={[memberWithManyApps]}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		
		expect(screen.getByText("Application 1")).toBeInTheDocument();
		expect(screen.getByText("Application 2")).toBeInTheDocument();
		expect(screen.getByText("Application 3")).toBeInTheDocument();
		expect(screen.getByText("Application 4")).toBeInTheDocument();

		
		expect(screen.getByText("+ 2")).toBeInTheDocument();
	});

	it("shows no access for members with empty project access", () => {
		const memberWithNoAccess = {
			...mockMembers[2],
			projectAccess: [],
		};

		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={[memberWithNoAccess]}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		expect(screen.getByText("No access")).toBeInTheDocument();
	});

	it("handles invite error gracefully", async () => {
		const user = userEvent.setup();
		vi.mocked(inviteCollaborator).mockResolvedValue({ error: "Email already exists", success: false });

		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		await user.click(screen.getByTestId("invite-button"));
		await user.click(screen.getByTestId("mock-invite-submit"));

		await waitFor(() => {
			expect(inviteCollaborator).toHaveBeenCalled();
		});

		
		expect(screen.getByTestId("invite-collaborator-modal")).toBeInTheDocument();
	});

	it("handles missing user display name when inviting", async () => {
		const user = userEvent.setup();
		vi.mocked(useUserStore).mockReturnValue({ user: { ...mockUser, displayName: undefined } } as any);

		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.OWNER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		await user.click(screen.getByTestId("invite-button"));
		await user.click(screen.getByTestId("mock-invite-submit"));

		
		expect(inviteCollaborator).not.toHaveBeenCalled();
	});

	it("members cannot see action menus", () => {
		render(
			<ProjectSettingsMembers
				currentUserRole={UserRole.MEMBER}
				members={mockMembers}
				projectId={mockProject.id}
				projectName={mockProject.name}
			/>,
		);

		
		expect(screen.queryByTestId("member-action-menu-1")).not.toBeInTheDocument();
		expect(screen.queryByTestId("member-action-menu-2")).not.toBeInTheDocument();
		expect(screen.queryByTestId("member-action-menu-3")).not.toBeInTheDocument();
	});
});
