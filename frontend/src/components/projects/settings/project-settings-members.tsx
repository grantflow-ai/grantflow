"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { inviteCollaborator } from "@/actions/project-invitation";
import { AppAvatar } from "@/components/app";
import { useUserStore } from "@/stores/user-store";
import { UserRole } from "@/types/user";
import { logTrace } from "@/utils/logging";
import { generateInitials } from "@/utils/user";
import { InviteCollaboratorModal } from "../modals/invite-collaborator-modal";
import { EditPermissionModal } from "./edit-permission-modal";

interface ProjectMember {
	email: string;
	firebaseUid: string;
	fullName?: string;
	id: string;
	joinedAt: string;
	photoUrl?: string;
	projectAccess?: string[]; 
	role: UserRole;
	status: "active" | "pending";
}

interface ProjectSettingsMembersProps {
	currentUserRole: UserRole;
	members?: ProjectMember[];
	projectId: string;
	projectName: string;
}

const ROLE_COLORS = {
	[UserRole.ADMIN]: "bg-[#9747ff] text-white",
	[UserRole.MEMBER]: "bg-text-secondary text-white",
	[UserRole.OWNER]: "bg-action-primary text-white",
};

const ROLE_LABELS = {
	[UserRole.ADMIN]: "Admin",
	[UserRole.MEMBER]: "Collaborator",
	[UserRole.OWNER]: "Owner",
};


const mockMembers: ProjectMember[] = [
	{
		email: "test@gmail.com",
		firebaseUid: "firebase-uid-1",
		fullName: "Name name",
		id: "1",
		joinedAt: "2025-01-15T10:00:00Z",
		projectAccess: [],
		role: UserRole.OWNER,
		status: "active", 
	},
	{
		email: "test@gmail.com",
		firebaseUid: "firebase-uid-2",
		fullName: "Name name",
		id: "2",
		joinedAt: "2025-01-20T10:00:00Z",
		projectAccess: [],
		role: UserRole.ADMIN,
		status: "active", 
	},
	{
		email: "test@gmail.com",
		firebaseUid: "firebase-uid-3",
		fullName: "Name name",
		id: "3",
		joinedAt: "2025-01-25T10:00:00Z",
		projectAccess: ["app1", "app2", "app3", "app4"],
		role: UserRole.MEMBER,
		status: "active", 
	},
];

const handleRemoveMember = (memberId: string) => {
	
	
	logTrace("info", "Remove member not implemented yet", { memberId });
};

const handleUpdateRole = (memberId: string, newRole: UserRole, projectAccess?: string[]) => {
	
	
	logTrace("info", "Update role not implemented yet", { memberId, newRole, projectAccess });
	return Promise.resolve();
};

export function ProjectSettingsMembers({
	currentUserRole,
	members = mockMembers,
	projectId,
	projectName,
}: ProjectSettingsMembersProps) {
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const [editingMember, setEditingMember] = useState<null | ProjectMember>(null);
	const { user } = useUserStore();

	const handleInvite = async (email: string, permission: "admin" | "collaborator") => {
		if (!user?.displayName) {
			logTrace("error", "User display name not available for invitation", { email, permission });
			return;
		}

		try {
			const result = await inviteCollaborator({
				email,
				inviterName: user.displayName,
				projectId,
				projectName,
				role: permission === "admin" ? "admin" : "member",
			});

			if (!result.success) {
				logTrace("error", "Failed to invite collaborator", { email, error: result.error });
				
				return;
			}

			
			
		} catch (error) {
			logTrace("error", "Error inviting collaborator", {
				email,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	};

	const canInvite = currentUserRole === UserRole.OWNER || currentUserRole === UserRole.ADMIN;

	return (
		<div className="w-full" data-testid="project-settings-members">
			{}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-[24px] font-medium text-text-primary mb-2 font-heading">Team Members</h2>
					<p className="text-text-secondary text-[16px] font-body">
						Manage who has access to this project and their permissions.
					</p>
				</div>
				{canInvite && (
					<button
						className="flex items-center gap-2 px-4 py-2 bg-action-primary text-white rounded-md hover:bg-action-primary/90 transition-colors text-[14px] font-body"
						data-testid="invite-button"
						onClick={() => {
							setIsInviteModalOpen(true);
						}}
						type="button"
					>
						<Plus className="size-4" />
						Invite
					</button>
				)}
			</div>

			{}
			<div className="bg-surface-primary border border-border-primary rounded-lg overflow-hidden">
				{}
				<div className="bg-surface-secondary border-b border-border-primary px-6 py-4">
					<div className="grid grid-cols-5 gap-4">
						<div className="font-semibold text-[14px] text-text-secondary font-body">Name</div>
						<div className="font-semibold text-[14px] text-text-secondary font-body">Email</div>
						<div className="font-semibold text-[14px] text-text-secondary font-body">Role</div>
						<div className="font-semibold text-[14px] text-text-secondary font-body">
							Research Projects Access
						</div>
						<div className="font-semibold text-[14px] text-text-secondary font-body">
							{}
						</div>
					</div>
				</div>

				{}
				<div className="divide-y divide-border-primary">
					{members.map((member) => (
						<div
							className="px-6 py-4 hover:bg-surface-secondary transition-colors"
							data-testid={`member-row-${member.id}`}
							key={member.id}
						>
							<div className="grid grid-cols-5 gap-4 items-center">
								{}
								<div className="flex items-center gap-3">
									<AppAvatar initials={generateInitials(member.fullName, member.email)} size="sm" />
									<span className="text-[16px] text-text-primary truncate font-body">
										{member.fullName ?? "Name name"}
									</span>
								</div>

								{}
								<div className="text-[14px] text-text-secondary truncate font-body">{member.email}</div>

								{}
								<div>
									<RoleBadge role={member.role} />
								</div>

								{}
								<div>
									<ProjectAccessBadges projectAccess={member.projectAccess} role={member.role} />
								</div>

								{}
								<div className="flex justify-end">
									<MemberActionMenu
										currentUserRole={currentUserRole}
										member={member}
										onEditPermissions={(member) => {
											setEditingMember(member);
										}}
										onRemoveMember={handleRemoveMember}
									/>
								</div>
							</div>
						</div>
					))}
				</div>

				{}
				{members.length === 0 && (
					<div className="px-6 py-12 text-center" data-testid="empty-state">
						<p className="text-[16px] text-text-secondary mb-4 font-body">No team members yet.</p>
						{canInvite && (
							<button
								className="flex items-center gap-2 px-4 py-2 bg-action-primary text-white rounded-md hover:bg-action-primary/90 transition-colors text-[14px] mx-auto font-body"
								data-testid="invite-first-member-button"
								onClick={() => {
									setIsInviteModalOpen(true);
								}}
								type="button"
							>
								<Plus className="size-4" />
								Invite your first team member
							</button>
						)}
					</div>
				)}
			</div>

			{}
			<div className="mt-6 grid grid-cols-3 gap-4">
				<div
					className="bg-surface-secondary border border-border-primary rounded-lg p-4"
					data-testid="total-members-stat"
				>
					<div className="text-[14px] text-text-secondary mb-1 font-body">Total Members</div>
					<div
						className="text-[24px] font-semibold text-text-primary font-heading"
						data-testid="total-members-count"
					>
						{members.length}
					</div>
				</div>
				<div
					className="bg-surface-secondary border border-border-primary rounded-lg p-4"
					data-testid="admins-stat"
				>
					<div className="text-[14px] text-text-secondary mb-1 font-body">Admins</div>
					<div
						className="text-[24px] font-semibold text-text-primary font-heading"
						data-testid="admins-count"
					>
						{members.filter((m) => m.role === UserRole.ADMIN || m.role === UserRole.OWNER).length}
					</div>
				</div>
				<div
					className="bg-surface-secondary border border-border-primary rounded-lg p-4"
					data-testid="collaborators-stat"
				>
					<div className="text-[14px] text-text-secondary mb-1 font-body">Collaborators</div>
					<div
						className="text-[24px] font-semibold text-text-primary font-heading"
						data-testid="collaborators-count"
					>
						{members.filter((m) => m.role === UserRole.MEMBER).length}
					</div>
				</div>
			</div>

			{}
			{isInviteModalOpen && (
				<InviteCollaboratorModal
					isOpen={isInviteModalOpen}
					onClose={() => {
						setIsInviteModalOpen(false);
					}}
					onInvite={handleInvite}
				/>
			)}

			{}
			<EditPermissionModal
				currentUserRole={currentUserRole}
				isOpen={editingMember !== null}
				member={editingMember}
				onClose={() => {
					setEditingMember(null);
				}}
				onUpdateRole={handleUpdateRole}
			/>
		</div>
	);
}

function MemberActionMenu({
	currentUserRole,
	member,
	onEditPermissions,
	onRemoveMember,
}: {
	currentUserRole: UserRole;
	member: ProjectMember;
	onEditPermissions: (member: ProjectMember) => void;
	onRemoveMember: (memberId: string) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && event.target && !menuRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	
	const canModify =
		member.role !== UserRole.OWNER && (currentUserRole === UserRole.OWNER || currentUserRole === UserRole.ADMIN);

	if (!canModify) {
		return null;
	}

	return (
		<div className="relative" ref={menuRef}>
			<button
				className="p-2 hover:bg-surface-secondary rounded-md transition-colors"
				data-testid={`member-action-menu-${member.id}`}
				onClick={() => {
					setIsOpen(!isOpen);
				}}
				type="button"
			>
				<MoreHorizontal className="size-4 text-text-secondary" />
			</button>

			{isOpen && (
				<div
					className="absolute right-0 top-full mt-1 w-48 bg-surface-primary border border-border-primary rounded-md shadow-lg z-10"
					data-testid={`member-action-dropdown-${member.id}`}
				>
					<div className="py-1">
						{currentUserRole === UserRole.OWNER && (
							<>
								<button
									className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-surface-secondary transition-colors"
									data-testid={`edit-permissions-${member.id}`}
									onClick={() => {
										onEditPermissions(member);
										setIsOpen(false);
									}}
									type="button"
								>
									Edit permissions
								</button>
								<hr className="my-1 border-border-primary" />
							</>
						)}
						<button
							className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
							data-testid={`remove-member-${member.id}`}
							onClick={() => {
								onRemoveMember(member.id);
								setIsOpen(false);
							}}
							type="button"
						>
							Remove from project
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

function ProjectAccessBadges({ projectAccess = [], role }: { projectAccess?: string[]; role: UserRole }) {
	
	if (role === UserRole.OWNER || role === UserRole.ADMIN) {
		return (
			<div className="flex items-center gap-2">
				<span className="px-3 py-1 bg-action-primary text-white rounded-full text-sm font-medium">All</span>
			</div>
		);
	}

	
	if (projectAccess.length === 0) {
		return (
			<div className="flex items-center gap-2">
				<span className="px-3 py-1 bg-surface-secondary text-text-secondary rounded-full text-sm">
					No access
				</span>
			</div>
		);
	}

	const displayedApps = projectAccess.slice(0, 4);
	const remainingCount = projectAccess.length - 4;

	return (
		<div className="flex items-center gap-2 flex-wrap">
			{displayedApps.map((appId, index) => (
				<span className="px-3 py-1 bg-action-primary text-white rounded-full text-sm font-medium" key={appId}>
					Application {index + 1}
				</span>
			))}
			{remainingCount > 0 && (
				<span className="px-3 py-1 bg-text-secondary text-white rounded-full text-sm font-medium">
					+ {remainingCount}
				</span>
			)}
		</div>
	);
}

function RoleBadge({ role }: { role: UserRole }) {
	return <span className={`px-2 py-1 rounded-md text-sm font-medium ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>;
}
