"use client";

import { Edit, MoreVertical, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import {
	createOrganizationInvitation,
	deleteOrganizationInvitation,
	getOrganizationInvitations,
	getOrganizationMembers,
	removeOrganizationMember,
	updateOrganizationMemberRole,
} from "@/actions/organization";
import { getProjects } from "@/actions/project";
import type { InviteOptions } from "@/components/organizations/modals/invite-collaborator-modal";
import { InviteCollaboratorModal } from "@/components/organizations/modals/invite-collaborator-modal";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationStore } from "@/stores/notification-store";
import type { API } from "@/types/api-types";
import { UserRole } from "@/types/user";
import { log } from "@/utils/logger/client";
import { generateInitials } from "@/utils/user";
import { EditPermissionModal } from "./edit-permission-modal";

interface OrganizationMember {
	displayName?: string;
	email?: string;
	firebaseUid: string;
	hasAllProjectsAccess?: boolean;
	invitationId?: string;
	joinedAt: string;
	photoUrl?: string;
	projectAccess?: ProjectAccess[];
	role: UserRole;
	status: "active" | "pending";
}

interface OrganizationSettingsMembersProps {
	currentUserRole: UserRole;
	onInviteHandlerChange?: (handler: (() => void) | undefined) => void;
	organizationId: string;
}

interface ProjectAccess {
	granted_at: string;
	project_id: string;
	project_name: string;
}

const AVATAR_COLORS = ["bg-[#369e94]", "bg-[#9747ff]", "bg-[#4dc283]", "bg-[#ff6b6b]", "bg-[#4ecdc4]", "bg-[#45b7d1]"];

const ROLE_LABELS = {
	[UserRole.ADMIN]: "Admin",
	[UserRole.COLLABORATOR]: "Collaborator",
	[UserRole.OWNER]: "Owner",
};

const EMPTY_PROJECTS: API.ListProjects.Http200.ResponseBody = [];
export function OrganizationSettingsMembers({
	currentUserRole,
	onInviteHandlerChange,
	organizationId,
}: OrganizationSettingsMembersProps) {
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const [editingMember, setEditingMember] = useState<null | OrganizationMember>(null);
	const { addNotification } = useNotificationStore();

	const { data: members = [], isLoading } = useSWR(
		`/organizations/${organizationId}/members`,
		() => getOrganizationMembers(organizationId),
		{
			revalidateOnFocus: false,
		},
	);

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
				projectName: "",
				title: "Member removed",
				type: "success",
			});
		} catch (error) {
			log.error("Error removing member", error, { firebaseUid });
			addNotification({
				message: "Failed to remove member from the organization",
				projectName: "",
				title: "Error",
				type: "warning",
			});
		}
	};

	const handleUpdateRole = async (firebaseUid: string, newRole: UserRole, hasAllProjectsAccess?: boolean) => {
		try {
			const updateData: API.UpdateMemberRole.RequestBody = {
				role: newRole,
			};

			if (newRole === UserRole.COLLABORATOR && hasAllProjectsAccess !== undefined) {
				updateData.has_all_projects_access = hasAllProjectsAccess;
			}

			await updateOrganizationMemberRole(organizationId, firebaseUid, updateData);
			await mutate(`/organizations/${organizationId}/members`);
			addNotification({
				message: `Member role has been updated to ${ROLE_LABELS[newRole]}`,
				projectName: "",
				title: "Role updated",
				type: "success",
			});
		} catch (error) {
			log.error("Error updating member role", error, { firebaseUid, newRole });
			addNotification({
				message: "Failed to update member role",
				projectName: "",
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
				projectName: "",
				title: "Invitation cancelled",
				type: "success",
			});
		} catch (error) {
			log.error("Error cancelling invitation", error, { email, invitationId });
			addNotification({
				message: "Failed to cancel invitation",
				projectName: "",
				title: "Error",
				type: "warning",
			});
		}
	};

	const handleInvite = async ({ email, hasAllProjectsAccess, projectIds, role }: InviteOptions) => {
		try {
			await createOrganizationInvitation(organizationId, {
				email,
				has_all_projects_access: hasAllProjectsAccess,
				project_ids: projectIds,
				role,
			});

			await mutate(`/organizations/${organizationId}/invitations`);
			addNotification({
				message: `Invitation sent to ${email}`,
				projectName: "",
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
				projectName: "",
				title: "Error",
				type: "warning",
			});
		}
	};

	const canInvite = currentUserRole === UserRole.OWNER || currentUserRole === UserRole.ADMIN;

	const openInviteModal = useCallback(() => {
		setIsInviteModalOpen(true);
	}, []);

	useEffect(() => {
		if (onInviteHandlerChange) {
			onInviteHandlerChange(canInvite ? () => openInviteModal : undefined);
		}
	}, [canInvite, onInviteHandlerChange, openInviteModal]);

	const mappedMembers: OrganizationMember[] = members.map((member) => ({
		displayName: member.display_name,
		email: member.email,
		firebaseUid: member.firebase_uid,
		hasAllProjectsAccess: member.has_all_projects_access,
		joinedAt: member.created_at,
		photoUrl: member.photo_url,
		projectAccess: member.project_access,
		role: member.role as UserRole,
		status: "active" as const,
	}));

	const pendingMembers: OrganizationMember[] = invitations.map((invitation) => ({
		email: invitation.email,
		firebaseUid: "",
		invitationId: invitation.id,
		joinedAt: invitation.invitation_sent_at,
		projectAccess: [],
		role: invitation.role as UserRole,
		status: "pending" as const,
	}));

	const { data: projects = EMPTY_PROJECTS } = useSWR(
		`/organizations/${organizationId}/projects`,
		() => getProjects(organizationId),
		{
			revalidateOnFocus: false,
		},
	);
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
			<div className="w-full">
				<table className="w-full">
					<thead>
						<tr className="border-b border-app-gray-600">
							<th className="h-[38px] text-left px-6 py-2 " />
							<th className="h-[38px] text-left px-6 py-2 font-cabin font-semibold text-base text-app-black">
								Name
							</th>
							<th className="h-[38px] text-left px-6 py-2 font-cabin font-semibold text-base text-app-black">
								Email
							</th>
							<th className="h-[38px] text-left px-6 py-2 font-cabin font-semibold text-base text-app-black">
								Role
							</th>
							<th className="h-[38px] text-left px-6 py-2 font-cabin font-semibold text-base text-app-black">
								Research Projects Access
							</th>
							<th className="h-[38px] text-center px-6 ">&nbsp;</th>
						</tr>
					</thead>
					<tbody>
						{allMembers.map((member) => (
							<tr
								className={`border-b border-app-gray-100 bg-white hover:bg-app-gray-50 cursor-pointer ${
									member.status === "pending" ? "bg-app-gray-50" : ""
								}`}
								key={member.firebaseUid || member.invitationId}
							>
								<td className="h-[41px] px-6 py-2">
									<div className="flex items-center justify-center gap-3">
										<ColoredAvatar
											email={member.email ?? member.firebaseUid}
											initials={generateInitials(
												member.displayName,
												member.email ?? member.firebaseUid,
											)}
										/>
									</div>
								</td>
								<td className="h-[41px] px-6 py-2">
									<span className="font-body text-base font-normal text-app-gray-700">
										{member.displayName ?? "Name name"}
									</span>
								</td>
								<td className="h-[41px] px-6 py-2">
									<span className="font-body text-base font-normal text-app-gray-600">
										{member.email ?? "Text@gmail.com"}
									</span>
								</td>
								<td className="h-[41px] px-6 py-2">
									<FigmaRoleBadge role={member.role} />
								</td>
								<td className="h-[41px] px-6 py-2">
									<ResearchProjectsAccess member={member} />
								</td>
								<td className="h-[41px] px-6 py-2 text-center">
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

				{allMembers.length === 0 && (
					<div className="px-6 py-12 text-center" data-testid="organization-empty-state">
						<p className="text-[16px] text-app-gray-600 mb-4 font-body">No organization members yet.</p>
					</div>
				)}
			</div>

			<InviteCollaboratorModal
				isOpen={isInviteModalOpen}
				onClose={() => {
					setIsInviteModalOpen(false);
				}}
				onInvite={handleInvite}
				projects={projects}
			/>

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

const hashCode = (str: string) => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.codePointAt(i) ?? 0;
		hash = (hash << 5) - hash + char;
		hash &= hash;
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
	return (
		<span className="px-2 py-1 rounded-[20px] text-xs font-body text-secondary font-normal bg-app-gray-100 ">
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
	member: OrganizationMember;
	onCancelInvitation?: () => void;
	onEditPermissions: (member: OrganizationMember) => void;
	onRemoveMember: () => void;
}) {
	const canModify =
		member.role !== UserRole.OWNER && (currentUserRole === UserRole.OWNER || currentUserRole === UserRole.ADMIN);
	const isPending = member.status === "pending";

	if (!(canModify || isPending)) {
		return null;
	}

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger
				className="p-2 hover:bg-app-gray-50 rounded transition-colors"
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				<MoreVertical className="size-4 text-app-gray-700" />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-[200px] rounded-sm bg-white border border-gray-200 shadow-none p-1"
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				{isPending && onCancelInvitation ? (
					<DropdownMenuItem
						className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-primary data-[highlighted]:!text-white transition-colors group"
						onClick={(e) => {
							e.stopPropagation();
							onCancelInvitation();
						}}
					>
						<X className="size-4 text-gray-700 group-data-[highlighted]:text-white" />
						Remove Access
					</DropdownMenuItem>
				) : (
					<>
						{currentUserRole === UserRole.OWNER && (
							<DropdownMenuItem
								className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-primary data-[highlighted]:!text-white transition-colors group"
								onClick={(e) => {
									e.stopPropagation();
									onEditPermissions(member);
								}}
							>
								<Edit className="size-4 text-gray-700 group-data-[highlighted]:text-white" />
								Edit
							</DropdownMenuItem>
						)}
						<DropdownMenuItem
							className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-primary data-[highlighted]:!text-white transition-colors group"
							onClick={(e) => {
								e.stopPropagation();
								onRemoveMember();
							}}
						>
							<X className="size-4 text-gray-700 group-data-[highlighted]:text-white" />
							Remove Access
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ResearchProjectsAccess({ member }: { member: OrganizationMember }) {
	if (member.role === UserRole.OWNER || member.role === UserRole.ADMIN || member.hasAllProjectsAccess) {
		return <span className="font-body text-sm text-white bg-secondary px-2  rounded-[20px] h-[18px]">All</span>;
	}

	const projectAccess = member.projectAccess ?? [];
	const displayProjects = projectAccess.slice(0, 2);
	const remainingCount = projectAccess.length - displayProjects.length;

	return (
		<div className="flex items-center gap-1">
			{displayProjects.map((project) => (
				<span
					className="font-body text-sm text-white bg-secondary px-2 py-0.5  rounded-[20px] "
					key={project.project_id}
				>
					{project.project_name}
				</span>
			))}
			{remainingCount > 0 && (
				<span className="font-body text-sm text-white bg-secondary px-2 py-0.5  rounded-[20px] gap-1  ">
					+ {remainingCount}
				</span>
			)}
		</div>
	);
}
