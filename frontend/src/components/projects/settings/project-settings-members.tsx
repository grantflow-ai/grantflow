"use client";

import { Edit, MoreVertical, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { deleteInvitation, getProjectMembers, removeProjectMember, updateProjectMemberRole } from "@/actions/project";
import { inviteCollaborator } from "@/actions/project-invitation";
import { EditPermissionModal, InviteCollaboratorModal } from "@/components/projects";
import { useNotificationStore } from "@/stores/notification-store";
import { useUserStore } from "@/stores/user-store";
import { UserRole } from "@/types/user";
import { log } from "@/utils/logger";
import { generateInitials } from "@/utils/user";

interface ProjectMember {
	email: string;
	firebaseUid: string;
	fullName?: null | string;
	invitationId?: string;
	joinedAt: string;
	photoUrl?: null | string;
	role: UserRole;
	status: "active" | "pending";
}

interface ProjectSettingsMembersProps {
	currentUserRole: UserRole;
	onInviteHandlerChange?: (handler: (() => void) | undefined) => void;
	projectId: string;
	projectName: string;
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
	[UserRole.MEMBER]: "Collaborator",
	[UserRole.OWNER]: "Owner",
};

export function ProjectSettingsMembers({
	currentUserRole,
	onInviteHandlerChange,
	projectId,
	projectName,
}: ProjectSettingsMembersProps) {
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

	const handleUpdateRole = async (firebaseUid: string, newRole: UserRole) => {
		try {
			await updateProjectMemberRole(projectId, firebaseUid, { role: newRole });
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

			const newPendingInvitation: ProjectMember = {
				email,
				firebaseUid: "",
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

	// Pass invite handler to parent
	useEffect(() => {
		if (onInviteHandlerChange) {
			onInviteHandlerChange(
				canInvite
					? () => {
							setIsInviteModalOpen(true);
						}
					: undefined,
			);
		}
	}, [canInvite, onInviteHandlerChange]);

	// Map API response to component format and combine with pending invitations
	const mappedMembers: ProjectMember[] = members.map((member) => ({
		email: member.email,
		firebaseUid: member.firebase_uid,
		fullName: member.display_name,
		joinedAt: member.joined_at,
		photoUrl: member.photo_url,
		role: member.role as UserRole,
		status: "active" as const,
	}));

	// Combine active members and pending invitations
	const allMembers = [...mappedMembers, ...pendingInvitations];

	if (isLoading) {
		return (
			<div className="w-full flex items-center justify-center py-12">
				<p className="text-app-gray-600">Loading members...</p>
			</div>
		);
	}

	return (
		<div className="w-full" data-testid="project-settings-members">
			{/* Table Structure */}
			<div className="w-full">
				<div className="flex w-full">
					{/* Avatar Column */}
					<div className="flex flex-col min-w-[60px]">
						{/* Header */}
						<div className="h-[41px] border-b border-app-gray-400 flex items-center justify-center px-2">
							<div className="font-heading font-semibold text-[16px] text-app-black">&nbsp;</div>
						</div>
						{/* Rows */}
						{allMembers.map((member) => (
							<div
								className={`h-[41px] border-b border-app-gray-100 flex items-center justify-center px-2 ${
									member.status === "pending" ? "bg-app-gray-20" : ""
								}`}
								key={member.firebaseUid || member.email}
							>
								<ColoredAvatar
									email={member.email}
									initials={generateInitials(member.fullName ?? undefined, member.email)}
								/>
							</div>
						))}
					</div>

					{/* Name Column */}
					<div className="flex-1 flex flex-col min-w-[150px]">
						{/* Header */}
						<div className="h-[41px] border-b border-app-gray-400 flex items-center px-2">
							<div className="font-heading font-semibold text-[16px] text-app-black">Name</div>
						</div>
						{/* Rows */}
						{allMembers.map((member) => (
							<div
								className={`h-[41px] border-b border-app-gray-100 flex items-center px-2 ${
									member.status === "pending" ? "bg-app-gray-20" : ""
								}`}
								key={member.firebaseUid || member.email}
							>
								<div className="font-body text-[14px] text-app-gray-600">
									{member.fullName ?? "Name name"}
								</div>
							</div>
						))}
					</div>

					{/* Email Column */}
					<div className="flex-1 flex flex-col min-w-[180px]">
						{/* Header */}
						<div className="h-[41px] border-b border-app-gray-400 flex items-center px-2">
							<div className="font-heading font-semibold text-[16px] text-app-black">Email</div>
						</div>
						{/* Rows */}
						{allMembers.map((member) => (
							<div
								className={`h-[41px] border-b border-app-gray-100 flex items-center px-2 ${
									member.status === "pending" ? "bg-app-gray-20" : ""
								}`}
								key={member.firebaseUid || member.email}
							>
								<div className="font-body text-[14px] text-app-gray-600">{member.email}</div>
							</div>
						))}
					</div>

					{/* Role Column */}
					<div className="flex-1 flex flex-col min-w-[120px]">
						{/* Header */}
						<div className="h-[41px] border-b border-app-gray-400 flex items-center px-2">
							<div className="font-heading font-semibold text-[16px] text-app-black">Role</div>
						</div>
						{/* Rows */}
						{allMembers.map((member) => (
							<div
								className={`h-[41px] border-b border-app-gray-100 flex items-center px-2 ${
									member.status === "pending" ? "bg-app-gray-20" : ""
								}`}
								key={member.firebaseUid || member.email}
							>
								<FigmaRoleBadge role={member.role} />
							</div>
						))}
					</div>

					{/* Actions Column */}
					<div className="flex flex-col min-w-[60px]">
						{/* Header */}
						<div className="h-[41px] border-b border-app-gray-400 flex items-center justify-center px-2">
							<div className="font-heading font-semibold text-[16px] text-app-black">&nbsp;</div>
						</div>
						{/* Rows */}
						{allMembers.map((member) => (
							<div
								className={`h-[41px] border-b border-app-gray-100 flex items-center justify-center px-2 ${
									member.status === "pending" ? "bg-app-gray-20" : ""
								}`}
								key={member.firebaseUid || member.email}
							>
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
						))}
					</div>
				</div>

				{/* Empty State */}
				{allMembers.length === 0 && (
					<div className="px-6 py-12 text-center" data-testid="empty-state">
						<p className="text-[16px] text-app-gray-600 mb-4 font-body">No team members yet.</p>
					</div>
				)}
			</div>

			{/* Modals */}
			{isInviteModalOpen && (
				<InviteCollaboratorModal
					isOpen={isInviteModalOpen}
					onClose={() => {
						setIsInviteModalOpen(false);
					}}
					onInvite={handleInvite}
				/>
			)}

			<EditPermissionModal
				currentUserRole={currentUserRole}
				isOpen={editingMember !== null}
				member={editingMember}
				onClose={() => {
					setEditingMember(null);
				}}
				onUpdateRole={(firebaseUid, newRole) => handleUpdateRole(firebaseUid, newRole)}
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
		<div className={`size-[25px] rounded flex items-center justify-center ${colorClass}`}>
			<span className="font-body font-semibold text-[16px] text-white">{initials}</span>
		</div>
	);
}

function FigmaRoleBadge({ role }: { role: UserRole }) {
	return (
		<span className="px-2 py-0 bg-app-gray-100 rounded-[20px] text-[12px] font-body text-app-dark-blue">
			{ROLE_LABELS[role]}
		</span>
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
				className="p-1 hover:bg-app-gray-100 rounded transition-colors"
				onClick={() => {
					setIsOpen(!isOpen);
				}}
				type="button"
			>
				<MoreVertical className="size-4 text-app-gray-600" />
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
