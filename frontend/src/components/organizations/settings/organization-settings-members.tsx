"use client";

import { Edit, MoreVertical, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import {
	createOrganizationInvitation,
	deleteOrganizationInvitation,
	getOrganizationInvitations,
	getOrganizationMembers,
	removeOrganizationMember,
	updateOrganizationMemberRole,
} from "@/actions/organization";
import { InviteCollaboratorModal } from "@/components/organizations";
import { useNotificationStore } from "@/stores/notification-store";
import { UserRole } from "@/types/user";
import { log } from "@/utils/logger";
import { generateInitials } from "@/utils/user";
import { EditPermissionModal } from "./edit-permission-modal";

interface OrganizationMember {
	displayName?: string;
	// User data
	email?: string;
	firebaseUid: string;
	invitationId?: string;
	joinedAt: string;
	photoUrl?: string;
	role: UserRole;
	status: "active" | "pending";
}

interface OrganizationSettingsMembersProps {
	currentUserRole: UserRole;
	onInviteHandlerChange?: (handler: (() => void) | undefined) => void;
	organizationId: string;
}

// Avatar colors based on email hash
const AVATAR_COLORS = [
	"bg-[#369e94]", // Teal (like in Figma)
	"bg-[#9747ff]", // Purple (like in Figma)
	"bg-[#4dc283]", // Green (like in Figma)
	"bg-[#ff6b6b]", // Red
	"bg-[#4ecdc4]", // Cyan
	"bg-[#45b7d1]", // Blue
];

const ROLE_LABELS = {
	[UserRole.ADMIN]: "Admin",
	[UserRole.COLLABORATOR]: "Collaborator",
	[UserRole.OWNER]: "Owner",
};

export function OrganizationSettingsMembers({
	currentUserRole,
	onInviteHandlerChange,
	organizationId,
}: OrganizationSettingsMembersProps) {
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const [editingMember, setEditingMember] = useState<null | OrganizationMember>(null);
	const { addNotification } = useNotificationStore();

	// Fetch organization members
	const { data: members = [], isLoading } = useSWR(
		`/organizations/${organizationId}/members`,
		() => getOrganizationMembers(organizationId),
		{
			revalidateOnFocus: false,
		},
	);

	// Fetch pending invitations
	const { data: invitations = [] } = useSWR(
		`/organizations/${organizationId}/invitations`,
		() => getOrganizationInvitations(organizationId),
		{
			revalidateOnFocus: false,
		},
	);

	const handleRemoveMember = async (firebaseUid: string) => {
		try {
			await removeOrganizationMember(organizationId, firebaseUid);
			await mutate(`/organizations/${organizationId}/members`);
			addNotification({
				message: "The member has been removed from the organization",
				projectName: "", // Organization-level notification
				title: "Member removed",
				type: "success",
			});
		} catch (error) {
			log.error("Error removing member", error, { firebaseUid });
			addNotification({
				message: "Failed to remove member from the organization",
				projectName: "", // Organization-level notification
				title: "Error",
				type: "warning",
			});
		}
	};

	const handleUpdateRole = async (firebaseUid: string, newRole: UserRole) => {
		try {
			await updateOrganizationMemberRole(organizationId, firebaseUid, { role: newRole });
			await mutate(`/organizations/${organizationId}/members`);
			addNotification({
				message: `Member role has been updated to ${ROLE_LABELS[newRole]}`,
				projectName: "", // Organization-level notification
				title: "Role updated",
				type: "success",
			});
		} catch (error) {
			log.error("Error updating member role", error, { firebaseUid, newRole });
			addNotification({
				message: "Failed to update member role",
				projectName: "", // Organization-level notification
				title: "Error",
				type: "warning",
			});
		}
	};

	const handleCancelInvitation = async (invitationId: string, email: string) => {
		try {
			await deleteOrganizationInvitation(organizationId, invitationId);
			await mutate(`/organizations/${organizationId}/invitations`);
			addNotification({
				message: `Invitation to ${email} has been cancelled`,
				projectName: "", // Organization-level notification
				title: "Invitation cancelled",
				type: "success",
			});
		} catch (error) {
			log.error("Error cancelling invitation", error, { email, invitationId });
			addNotification({
				message: "Failed to cancel invitation",
				projectName: "", // Organization-level notification
				title: "Error",
				type: "warning",
			});
		}
	};

	const handleInvite = async (
		email: string,
		permission: "admin" | "collaborator",
		hasAllProjectsAccess?: boolean,
		projectIds?: string[],
	) => {
		try {
			await createOrganizationInvitation(organizationId, {
				email,
				has_all_projects_access: hasAllProjectsAccess,
				project_ids: projectIds,
				role: permission === "admin" ? "ADMIN" : "COLLABORATOR",
			});

			await mutate(`/organizations/${organizationId}/invitations`);
			addNotification({
				message: `Invitation sent to ${email}`,
				projectName: "", // Organization-level notification
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
				projectName: "", // Organization-level notification
				title: "Error",
				type: "warning",
			});
		}
	};

	const canInvite = currentUserRole === UserRole.OWNER || currentUserRole === UserRole.ADMIN;

	// Create a stable handler for opening the invite modal
	const openInviteModal = useCallback(() => {
		setIsInviteModalOpen(true);
	}, []);

	// Pass invite handler to parent
	useEffect(() => {
		if (onInviteHandlerChange) {
			onInviteHandlerChange(canInvite ? openInviteModal : undefined);
		}
	}, [canInvite, onInviteHandlerChange, openInviteModal]);

	// Map API response to component format
	const mappedMembers: OrganizationMember[] = members.map((member) => ({
		displayName: member.display_name,
		email: member.email,
		firebaseUid: member.firebase_uid,
		joinedAt: member.created_at,
		photoUrl: member.photo_url,
		role: member.role as UserRole,
		status: "active" as const,
	}));

	// Map invitations to pending members
	const pendingMembers: OrganizationMember[] = invitations.map((invitation) => ({
		email: invitation.email,
		firebaseUid: "",
		invitationId: invitation.id,
		joinedAt: invitation.invitation_sent_at,
		role: invitation.role as UserRole,
		status: "pending" as const,
	}));

	// Combine active members and pending invitations
	const allMembers = [...mappedMembers, ...pendingMembers];

	if (isLoading) {
		return (
			<div className="w-full flex items-center justify-center py-12">
				<p className="text-app-gray-600">Loading members...</p>
			</div>
		);
	}

	return (
		<div className="w-full" data-testid="organization-settings-members">
			{/* Table Structure */}
			<div className="w-full">
				<table className="w-full">
					<thead>
						<tr className="border-b border-app-gray-300">
							<th className="h-[56px] text-left px-6 font-heading font-medium text-[16px] text-app-black">
								Name
							</th>
							<th className="h-[56px] text-left px-6 font-heading font-medium text-[16px] text-app-black">
								Email
							</th>
							<th className="h-[56px] text-left px-6 font-heading font-medium text-[16px] text-app-black">
								Role
							</th>
							<th className="h-[56px] text-left px-6 font-heading font-medium text-[16px] text-app-black">
								Research Projects Access
							</th>
							<th className="h-[56px] text-center px-6 font-heading font-medium text-[16px] text-app-black">
								&nbsp;
							</th>
						</tr>
					</thead>
					<tbody>
						{allMembers.map((member) => (
							<tr
								className={`border-b border-app-gray-100 ${
									member.status === "pending" ? "bg-app-gray-50" : ""
								}`}
								key={member.firebaseUid || member.invitationId}
							>
								<td className="h-[64px] px-6">
									<div className="flex items-center gap-3">
										<ColoredAvatar
											email={member.email ?? member.firebaseUid}
											initials={generateInitials(
												member.displayName,
												member.email ?? member.firebaseUid,
											)}
										/>
										<span className="font-body text-[14px] text-app-gray-700">
											{member.displayName || "Name name"}
										</span>
									</div>
								</td>
								<td className="h-[64px] px-6">
									<span className="font-body text-[14px] text-app-gray-600">
										{member.email || "Text@gmail.com"}
									</span>
								</td>
								<td className="h-[64px] px-6">
									<FigmaRoleBadge role={member.role} />
								</td>
								<td className="h-[64px] px-6">
									<ResearchProjectsAccess role={member.role} />
								</td>
								<td className="h-[64px] px-6 text-center">
									<MemberActionMenu
										currentUserRole={currentUserRole}
										member={member}
										onCancelInvitation={
											member.status === "pending" && member.invitationId
												? () => handleCancelInvitation(member.invitationId!, member.email!)
												: undefined
										}
										onEditPermissions={(member) => {
											setEditingMember(member);
										}}
										onRemoveMember={() => handleRemoveMember(member.firebaseUid)}
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>

				{/* Empty State */}
				{allMembers.length === 0 && (
					<div className="px-6 py-12 text-center" data-testid="organization-empty-state">
						<p className="text-[16px] text-app-gray-600 mb-4 font-body">No organization members yet.</p>
					</div>
				)}
			</div>

			{/* Modals */}
			<InviteCollaboratorModal
				isOpen={isInviteModalOpen}
				onClose={() => {
					setIsInviteModalOpen(false);
				}}
				onInvite={handleInvite}
			/>

			<EditPermissionModal
				currentUserRole={currentUserRole}
				isOpen={editingMember !== null}
				member={editingMember}
				onClose={() => {
					setEditingMember(null);
				}}
				onUpdateRole={(firebaseUid: string, newRole: UserRole) => handleUpdateRole(firebaseUid, newRole)}
			/>
		</div>
	);
}

// Simple hash function to get consistent color based on email
const hashCode = (str: string) => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.codePointAt(i) ?? 0;
		hash = (hash << 5) - hash + char;
		hash &= hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
};

function ColoredAvatar({ email, initials }: { email: string; initials: string }) {
	const colorIndex = hashCode(email) % AVATAR_COLORS.length;
	const colorClass = AVATAR_COLORS[colorIndex];

	return (
		<div className={`size-8 rounded-md flex items-center justify-center ${colorClass}`}>
			<span className="font-body font-semibold text-[14px] text-white">{initials}</span>
		</div>
	);
}

function FigmaRoleBadge({ role }: { role: UserRole }) {
	const getRoleColor = () => {
		switch (role) {
			case UserRole.ADMIN: {
				return "bg-link-hover text-white";
			}
			case UserRole.OWNER: {
				return "bg-primary text-white";
			}
			default: {
				return "bg-app-gray-100 text-app-gray-700";
			}
		}
	};

	return (
		<span className={`px-3 py-1 rounded-full text-[12px] font-body ${getRoleColor()}`}>{ROLE_LABELS[role]}</span>
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
	member: OrganizationMember;
	onCancelInvitation?: () => void;
	onEditPermissions: (member: OrganizationMember) => void;
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
				className="p-2 hover:bg-app-gray-50 rounded transition-colors"
				onClick={() => {
					setIsOpen(!isOpen);
				}}
				type="button"
			>
				<MoreVertical className="size-4 text-app-gray-700" />
			</button>

			{isOpen && (
				<div className="absolute right-0 top-full mt-1 w-[200px] bg-white border border-app-gray-100 rounded shadow-lg z-10">
					<div className="py-1">
						{isPending && onCancelInvitation ? (
							<button
								className="w-full px-3 py-3 text-left text-[16px] text-app-black hover:bg-app-gray-20 transition-colors flex items-center gap-2"
								onClick={() => {
									onCancelInvitation();
									setIsOpen(false);
								}}
								type="button"
							>
								<X className="size-4" />
								Remove
							</button>
						) : (
							<>
								{currentUserRole === UserRole.OWNER && (
									<button
										className="w-full px-3 py-3 text-left text-[16px] text-app-black hover:bg-app-gray-20 transition-colors flex items-center gap-2"
										onClick={() => {
											onEditPermissions(member);
											setIsOpen(false);
										}}
										type="button"
									>
										<Edit className="size-4" />
										Edit Permission
									</button>
								)}
								<button
									className="w-full px-3 py-3 text-left text-[16px] text-app-black hover:bg-app-gray-20 transition-colors flex items-center gap-2"
									onClick={() => {
										onRemoveMember();
										setIsOpen(false);
									}}
									type="button"
								>
									<X className="size-4" />
									Remove
								</button>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function ResearchProjectsAccess({ role }: { role: UserRole }) {
	// Mock data for project access - in real implementation this would come from the API
	const projectAccess = [
		{ count: 2, name: "Project name" },
		{ count: 3, name: "Project name" },
		{ count: 1, name: "Project name" },
	];

	// Owner and Admin have access to all projects
	if (role === UserRole.OWNER || role === UserRole.ADMIN) {
		return <span className="font-body text-[14px] text-app-gray-700">All</span>;
	}

	// Collaborators have specific project access
	return (
		<div className="flex items-center gap-2">
			{projectAccess.map((project, index) => (
				<span
					className="px-3 py-1 bg-app-gray-100 rounded-full text-[12px] font-body text-app-gray-700 inline-flex items-center gap-1"
					key={index}
				>
					{project.name}
					<span className="text-app-gray-500">+{project.count}</span>
				</span>
			))}
		</div>
	);
}
