"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { inviteCollaborator } from "@/actions/project-invitation";
import { InviteCollaboratorModal } from "@/components/projects/invite-collaborator-modal";
import { Avatar } from "@/components/ui/avatar";
import { useUserStore } from "@/stores/user-store";
import { UserRole } from "@/types/user";
import { logTrace } from "@/utils/logging";
import { generateInitials } from "@/utils/user";

interface ProjectMember {
	email: string;
	firebaseUid: string;
	fullName?: string;
	id: string;
	joinedAt: string;
	photoUrl?: string;
	projectAccess?: string[]; // Array of application IDs the user has access to
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
	[UserRole.MEMBER]: "bg-[#636170] text-white",
	[UserRole.OWNER]: "bg-[#1e13f8] text-white",
};

const ROLE_LABELS = {
	[UserRole.ADMIN]: "Admin",
	[UserRole.MEMBER]: "Collaborator",
	[UserRole.OWNER]: "Owner",
};

// Mock data for now - will be replaced with real API data
const mockMembers: ProjectMember[] = [
	{
		email: "test@gmail.com",
		firebaseUid: "firebase-uid-1",
		fullName: "Name name",
		id: "1",
		joinedAt: "2025-01-15T10:00:00Z",
		projectAccess: [],
		role: UserRole.OWNER,
		status: "active", // Owner has access to all
	},
	{
		email: "test@gmail.com",
		firebaseUid: "firebase-uid-2",
		fullName: "Name name",
		id: "2",
		joinedAt: "2025-01-20T10:00:00Z",
		projectAccess: [],
		role: UserRole.ADMIN,
		status: "active", // Admin has access to all
	},
	{
		email: "test@gmail.com",
		firebaseUid: "firebase-uid-3",
		fullName: "Name name",
		id: "3",
		joinedAt: "2025-01-25T10:00:00Z",
		projectAccess: ["app1", "app2", "app3", "app4"],
		role: UserRole.MEMBER,
		status: "active", // Specific application access
	},
];

const handleRemoveMember = (memberId: string) => {
	// Implementation will be added when backend is ready
	// This will call API to remove member from project
	logTrace("info", "Remove member not implemented yet", { memberId });
};

const handleChangeRole = (memberId: string, newRole: UserRole) => {
	// Implementation will be added when backend is ready
	// This will call API to change member role
	logTrace("info", "Change role not implemented yet", { memberId, newRole });
};

export function ProjectSettingsMembers({
	currentUserRole,
	members = mockMembers,
	projectId,
	projectName,
}: ProjectSettingsMembersProps) {
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
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
				// In a real app, you'd show a toast notification here
				return;
			}

			// Success - in a real app, you'd show a success toast
			// and possibly refresh the members list
		} catch (error) {
			logTrace("error", "Error inviting collaborator", {
				email,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	};

	const canInvite = currentUserRole === UserRole.OWNER || currentUserRole === UserRole.ADMIN;

	return (
		<div className="w-full">
			{/* Header with Invite Button */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-[24px] font-['Cabin'] font-medium text-[#2e2d36] mb-2">Team Members</h2>
					<p className="text-[#636170] font-['Source_Sans_Pro'] text-[16px]">
						Manage who has access to this project and their permissions.
					</p>
				</div>
				{canInvite && (
					<button
						className="flex items-center gap-2 px-4 py-2 bg-[#1e13f8] text-white rounded-md hover:bg-[#1710d4] transition-colors font-['Source_Sans_Pro'] text-[14px]"
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

			{/* Members Table */}
			<div className="bg-white border border-[#e1dfeb] rounded-lg overflow-hidden">
				{/* Table Header */}
				<div className="bg-[#faf9fb] border-b border-[#e1dfeb] px-6 py-4">
					<div className="grid grid-cols-5 gap-4">
						<div className="font-['Source_Sans_Pro'] font-semibold text-[14px] text-[#636170]">Name</div>
						<div className="font-['Source_Sans_Pro'] font-semibold text-[14px] text-[#636170]">Email</div>
						<div className="font-['Source_Sans_Pro'] font-semibold text-[14px] text-[#636170]">Role</div>
						<div className="font-['Source_Sans_Pro'] font-semibold text-[14px] text-[#636170]">
							Research Projects Access
						</div>
						<div className="font-['Source_Sans_Pro'] font-semibold text-[14px] text-[#636170]">
							{/* Actions column */}
						</div>
					</div>
				</div>

				{/* Table Body */}
				<div className="divide-y divide-[#e1dfeb]">
					{members.map((member) => (
						<div className="px-6 py-4 hover:bg-[#faf9fb] transition-colors" key={member.id}>
							<div className="grid grid-cols-5 gap-4 items-center">
								{/* Name with Avatar */}
								<div className="flex items-center gap-3">
									<Avatar initials={generateInitials(member.fullName, member.email)} size="sm" />
									<span className="font-['Source_Sans_Pro'] text-[16px] text-[#2e2d36] truncate">
										{member.fullName ?? "Name name"}
									</span>
								</div>

								{/* Email */}
								<div className="font-['Source_Sans_Pro'] text-[14px] text-[#636170] truncate">
									{member.email}
								</div>

								{/* Role Badge */}
								<div>
									<RoleBadge role={member.role} />
								</div>

								{/* Project Access */}
								<div>
									<ProjectAccessBadges projectAccess={member.projectAccess} role={member.role} />
								</div>

								{/* Actions */}
								<div className="flex justify-end">
									<MemberActionMenu
										currentUserRole={currentUserRole}
										member={member}
										onChangeRole={handleChangeRole}
										onRemoveMember={handleRemoveMember}
									/>
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Empty State */}
				{members.length === 0 && (
					<div className="px-6 py-12 text-center">
						<p className="font-['Source_Sans_Pro'] text-[16px] text-[#636170] mb-4">No team members yet.</p>
						{canInvite && (
							<button
								className="flex items-center gap-2 px-4 py-2 bg-[#1e13f8] text-white rounded-md hover:bg-[#1710d4] transition-colors font-['Source_Sans_Pro'] text-[14px] mx-auto"
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

			{/* Team Stats */}
			<div className="mt-6 grid grid-cols-3 gap-4">
				<div className="bg-[#faf9fb] border border-[#e1dfeb] rounded-lg p-4">
					<div className="font-['Source_Sans_Pro'] text-[14px] text-[#636170] mb-1">Total Members</div>
					<div className="font-['Cabin'] text-[24px] font-semibold text-[#2e2d36]">{members.length}</div>
				</div>
				<div className="bg-[#faf9fb] border border-[#e1dfeb] rounded-lg p-4">
					<div className="font-['Source_Sans_Pro'] text-[14px] text-[#636170] mb-1">Admins</div>
					<div className="font-['Cabin'] text-[24px] font-semibold text-[#2e2d36]">
						{members.filter((m) => m.role === UserRole.ADMIN || m.role === UserRole.OWNER).length}
					</div>
				</div>
				<div className="bg-[#faf9fb] border border-[#e1dfeb] rounded-lg p-4">
					<div className="font-['Source_Sans_Pro'] text-[14px] text-[#636170] mb-1">Collaborators</div>
					<div className="font-['Cabin'] text-[24px] font-semibold text-[#2e2d36]">
						{members.filter((m) => m.role === UserRole.MEMBER).length}
					</div>
				</div>
			</div>

			{/* Invite Modal */}
			{isInviteModalOpen && (
				<InviteCollaboratorModal
					isOpen={isInviteModalOpen}
					onClose={() => {
						setIsInviteModalOpen(false);
					}}
					onInvite={handleInvite}
				/>
			)}
		</div>
	);
}

function MemberActionMenu({
	currentUserRole,
	member,
	onChangeRole,
	onRemoveMember,
}: {
	currentUserRole: UserRole;
	member: ProjectMember;
	onChangeRole: (memberId: string, newRole: UserRole) => void;
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

	// Can't modify owner, can't modify if you're not owner/admin
	const canModify =
		member.role !== UserRole.OWNER && (currentUserRole === UserRole.OWNER || currentUserRole === UserRole.ADMIN);

	if (!canModify) {
		return null;
	}

	return (
		<div className="relative" ref={menuRef}>
			<button
				className="p-2 hover:bg-[#f5f5f5] rounded-md transition-colors"
				onClick={() => {
					setIsOpen(!isOpen);
				}}
				type="button"
			>
				<MoreHorizontal className="size-4 text-[#636170]" />
			</button>

			{isOpen && (
				<div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#e1dfeb] rounded-md shadow-lg z-10">
					<div className="py-1">
						{currentUserRole === UserRole.OWNER && (
							<>
								<button
									className="w-full px-4 py-2 text-left text-sm text-[#2e2d36] hover:bg-[#f5f5f5] transition-colors"
									onClick={() => {
										onChangeRole(
											member.id,
											member.role === UserRole.ADMIN ? UserRole.MEMBER : UserRole.ADMIN,
										);
										setIsOpen(false);
									}}
									type="button"
								>
									{member.role === UserRole.ADMIN ? "Change to Member" : "Change to Admin"}
								</button>
								<hr className="my-1 border-[#e1dfeb]" />
							</>
						)}
						<button
							className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
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
	// Owner and Admin have access to all projects
	if (role === UserRole.OWNER || role === UserRole.ADMIN) {
		return (
			<div className="flex items-center gap-2">
				<span className="px-3 py-1 bg-[#1e13f8] text-white rounded-full text-sm font-medium">All</span>
			</div>
		);
	}

	// Members have specific application access
	if (projectAccess.length === 0) {
		return (
			<div className="flex items-center gap-2">
				<span className="px-3 py-1 bg-[#f5f5f5] text-[#636170] rounded-full text-sm">No access</span>
			</div>
		);
	}

	const displayedApps = projectAccess.slice(0, 4);
	const remainingCount = projectAccess.length - 4;

	return (
		<div className="flex items-center gap-2 flex-wrap">
			{displayedApps.map((appId, index) => (
				<span className="px-3 py-1 bg-[#1e13f8] text-white rounded-full text-sm font-medium" key={appId}>
					Application {index + 1}
				</span>
			))}
			{remainingCount > 0 && (
				<span className="px-3 py-1 bg-[#636170] text-white rounded-full text-sm font-medium">
					+ {remainingCount}
				</span>
			)}
		</div>
	);
}

function RoleBadge({ role }: { role: UserRole }) {
	return <span className={`px-2 py-1 rounded-md text-sm font-medium ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>;
}
