"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { deleteInvitation, getProjectMembers, removeProjectMember, updateProjectMemberRole } from "@/actions/project";
import { inviteCollaborator } from "@/actions/project-invitation";
import { AppAvatar } from "@/components/app";
import { useNotificationStore } from "@/stores/notification-store";
import { useUserStore } from "@/stores/user-store";
import { UserRole } from "@/types/user";
import { log } from "@/utils/logger";
import { generateInitials } from "@/utils/user";
import { InviteCollaboratorModal } from "../modals/invite-collaborator-modal";
import { EditPermissionModal } from "./edit-permission-modal";

interface ProjectMember {
	email: string;
	firebaseUid: string;
	fullName?: null | string;
	invitationId?: string;
	joinedAt: string;
	photoUrl?: null | string;
	projectAccess?: string[];
	role: UserRole;
	status: "active" | "pending";
}

interface ProjectSettingsMembersProps {
	currentUserRole: UserRole;
	projectId: string;
	projectName: string;
}

const ROLE_COLORS = {
	[UserRole.ADMIN]: "bg-[#9747ff] text-white",
	[UserRole.MEMBER]: "bg-text-secondary text-white",
	[UserRole.OWNER]: "bg-primary text-white",
};

const ROLE_LABELS = {
	[UserRole.ADMIN]: "Admin",
	[UserRole.MEMBER]: "Collaborator",
	[UserRole.OWNER]: "Owner",
};

export function ProjectSettingsMembers({ currentUserRole, projectId, projectName }: ProjectSettingsMembersProps) {
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const [editingMember, setEditingMember] = useState<null | ProjectMember>(null);
	const [pendingInvitations, setPendingInvitations] = useState<ProjectMember[]>([]);
	const { user } = useUserStore();
	const { addNotification } = useNotificationStore();

	// Fetch project members
	const { data: members = [], isLoading } = useSWR(
		`/projects/${projectId}/members`,
		() => getProjectMembers(projectId),
		{
			revalidateOnFocus: false,
		},
	);

	const handleRemoveMember = async (firebaseUid: string) => {
		try {
			await removeProjectMember(projectId, firebaseUid);

			// Refresh the members list
			await mutate(`/projects/${projectId}/members`);

			addNotification({
				message: "The member has been removed from the project",
				projectName,
				title: "Member removed",
				type: "success",
			});
		} catch (error) {
			log.error("Error removing member", error, { firebaseUid });
			addNotification({
				message: "Failed to remove member from the project",
				projectName,
				title: "Error",
				type: "warning",
			});
		}
	};

	const handleUpdateRole = async (firebaseUid: string, newRole: UserRole, _projectAccess?: string[]) => {
		try {
			await updateProjectMemberRole(projectId, firebaseUid, { role: newRole });

			// Refresh the members list
			await mutate(`/projects/${projectId}/members`);

			addNotification({
				message: `Member role has been updated to ${ROLE_LABELS[newRole]}`,
				projectName,
				title: "Role updated",
				type: "success",
			});
		} catch (error) {
			log.error("Error updating member role", error, { firebaseUid, newRole });
			addNotification({
				message: "Failed to update member role",
				projectName,
				title: "Error",
				type: "warning",
			});
		}
	};

	const handleCancelInvitation = async (invitationId: string, email: string) => {
		try {
			await deleteInvitation(projectId, invitationId);

			// Remove from pending invitations
			setPendingInvitations((prev) => prev.filter((inv) => inv.invitationId !== invitationId));

			addNotification({
				message: `Invitation to ${email} has been cancelled`,
				projectName,
				title: "Invitation cancelled",
				type: "success",
			});
		} catch (error) {
			log.error("Error cancelling invitation", error, { email, invitationId });
			addNotification({
				message: "Failed to cancel invitation",
				projectName,
				title: "Error",
				type: "warning",
			});
		}
	};

	const handleInvite = async (email: string, permission: "admin" | "collaborator") => {
		if (!user?.displayName) {
			log.error("User display name not available for invitation", undefined, { email, permission });
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
				log.error("Failed to invite collaborator", new Error(result.error), { email });
				addNotification({
					message: result.error ?? "Failed to send invitation",
					projectName,
					title: "Invitation failed",
					type: "warning",
				});
				return;
			}

			// Add to pending invitations list
			const newPendingInvitation: ProjectMember = {
				email,
				firebaseUid: "", // Not applicable for pending invitations
				fullName: null,
				invitationId: result.invitationId,
				joinedAt: new Date().toISOString(),
				photoUrl: null,
				role: permission === "admin" ? UserRole.ADMIN : UserRole.MEMBER,
				status: "pending",
			};

			setPendingInvitations((prev) => [...prev, newPendingInvitation]);

			addNotification({
				message: `Invitation sent to ${email}`,
				projectName,
				title: "Invitation sent",
				type: "success",
			});
		} catch (error) {
			log.error("Error inviting collaborator", error, {
				email,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			addNotification({
				message: "Failed to send invitation",
				projectName,
				title: "Error",
				type: "warning",
			});
		}
	};

	const canInvite = currentUserRole === UserRole.OWNER || currentUserRole === UserRole.ADMIN;

	// Map API response to component format and combine with pending invitations
	const mappedMembers: ProjectMember[] = members.map((member) => ({
		email: member.email,
		firebaseUid: member.firebase_uid,
		fullName: member.display_name,
		joinedAt: member.joined_at,
		photoUrl: member.photo_url,
		projectAccess: [],
		role: member.role as UserRole,
		status: "active" as const,
	}));

	// Combine active members and pending invitations
	const allMembers = [...mappedMembers, ...pendingInvitations];

	if (isLoading) {
		return (
			<div className="w-full flex items-center justify-center py-12">
				<p className="text-text-secondary">Loading members...</p>
			</div>
		);
	}

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
						className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-sm font-body"
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
						<div className="font-semibold text-[14px] text-text-secondary font-body">{}</div>
					</div>
				</div>

				{}
				<div className="divide-y divide-border-primary">
					{allMembers.map((member) => (
						<div
							className="px-6 py-4 hover:bg-surface-secondary transition-colors"
							data-testid={`member-row-${member.firebaseUid || member.email}`}
							key={member.firebaseUid || member.email}
						>
							<div className="grid grid-cols-5 gap-4 items-center">
								{}
								<div className="flex items-center gap-3">
									<AppAvatar
										initials={generateInitials(member.fullName ?? undefined, member.email)}
										size="sm"
									/>
									<div className="flex flex-col">
										<span className="text-[16px] text-text-primary truncate font-body">
											{member.fullName ?? "Pending Invitation"}
										</span>
										{member.status === "pending" && (
											<span className="text-[12px] text-yellow-600 font-medium">
												Invitation sent
											</span>
										)}
									</div>
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
										onCancelInvitation={
											member.status === "pending" && member.invitationId
												? () => handleCancelInvitation(member.invitationId!, member.email)
												: undefined
										}
										onEditPermissions={(member) => {
											setEditingMember(member);
										}}
										onRemoveMember={() => handleRemoveMember(member.firebaseUid)}
									/>
								</div>
							</div>
						</div>
					))}
				</div>

				{}
				{allMembers.length === 0 && (
					<div className="px-6 py-12 text-center" data-testid="empty-state">
						<p className="text-[16px] text-text-secondary mb-4 font-body">No team members yet.</p>
						{canInvite && (
							<button
								className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-[14px] mx-auto font-body"
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
						{mappedMembers.length + pendingInvitations.length}
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
						{allMembers.filter((m) => m.role === UserRole.ADMIN || m.role === UserRole.OWNER).length}
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
						{allMembers.filter((m) => m.role === UserRole.MEMBER).length}
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
				onUpdateRole={(firebaseUid, newRole, projectAccess) =>
					handleUpdateRole(firebaseUid, newRole, projectAccess)
				}
			/>
		</div>
	);
}

function MemberActionMenu({
	currentUserRole,
	member,
	onCancelInvitation,
	onEditPermissions,
	onRemoveMember,
}: {
	currentUserRole: UserRole;
	member: ProjectMember;
	onCancelInvitation?: () => void;
	onEditPermissions: (member: ProjectMember) => void;
	onRemoveMember: () => void;
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

	const isPending = member.status === "pending";

	if (!(canModify || isPending)) {
		return null;
	}

	return (
		<div className="relative" ref={menuRef}>
			<button
				className="p-2 hover:bg-surface-secondary rounded-md transition-colors"
				data-testid={`member-action-menu-${member.firebaseUid || member.email}`}
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
					data-testid={`member-action-dropdown-${member.firebaseUid || member.email}`}
				>
					<div className="py-1">
						{isPending && onCancelInvitation ? (
							<button
								className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
								data-testid={`cancel-invitation-${member.email}`}
								onClick={() => {
									onCancelInvitation();
									setIsOpen(false);
								}}
								type="button"
							>
								Cancel invitation
							</button>
						) : (
							<>
								{currentUserRole === UserRole.OWNER && (
									<>
										<button
											className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-surface-secondary transition-colors"
											data-testid={`edit-permissions-${member.firebaseUid}`}
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
									data-testid={`remove-member-${member.firebaseUid}`}
									onClick={() => {
										onRemoveMember();
										setIsOpen(false);
									}}
									type="button"
								>
									Remove from project
								</button>
							</>
						)}
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
				<span className="px-3 py-1 bg-primary text-white rounded-full text-sm font-medium">All</span>
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
				<span className="px-3 py-1 bg-primary text-white rounded-full text-sm font-medium" key={appId}>
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
