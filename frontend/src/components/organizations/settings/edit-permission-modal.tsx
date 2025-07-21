"use client";

import { useState } from "react";
import { AppButton } from "@/components/app/buttons";
import { BaseModal } from "@/components/app/feedback";
import { UserRole } from "@/types/user";

interface EditPermissionModalProps {
	currentUserRole: UserRole;
	isOpen: boolean;
	member: null | OrganizationMember;
	onClose: () => void;
	onUpdateRole: (firebaseUid: string, newRole: UserRole) => void;
}

interface OrganizationMember {
	displayName?: string;
	email?: string;
	firebaseUid: string;
	invitationId?: string;
	joinedAt: string;
	photoUrl?: string;
	role: UserRole;
	status: "active" | "pending";
}

export function EditPermissionModal({
	currentUserRole,
	isOpen,
	member,
	onClose,
	onUpdateRole,
}: EditPermissionModalProps) {
	const [selectedRole, setSelectedRole] = useState<UserRole>(member?.role ?? UserRole.COLLABORATOR);

	const handleSave = () => {
		if (!member) return;
		onUpdateRole(member.firebaseUid, selectedRole);
		onClose();
	};

	const canChangeRole = (targetRole: UserRole) => {
		// Owners can change anyone to any role
		// Admins can only change to COLLABORATOR or ADMIN, not OWNER
		return (
			currentUserRole === UserRole.OWNER || (currentUserRole === UserRole.ADMIN && targetRole !== UserRole.OWNER)
		);
	};

	if (!member) return null;

	return (
		<BaseModal isOpen={isOpen} onClose={onClose} title="Edit Member Permissions">
			<div className="space-y-4">
				<div>
					<p className="text-sm text-app-gray-600">
						Change permissions for <strong>{member.displayName ?? member.email ?? "Unknown User"}</strong>
					</p>
				</div>

				<div className="space-y-2">
					<div className="block text-sm font-medium text-app-gray-700">Role</div>
					<div className="space-y-2">
						{[UserRole.COLLABORATOR, UserRole.ADMIN, UserRole.OWNER].map((role) => (
							<label className="flex items-center" key={role}>
								<input
									checked={selectedRole === role}
									className="mr-2"
									disabled={!canChangeRole(role)}
									name="role"
									onChange={(e) => {
										setSelectedRole(e.target.value as UserRole);
									}}
									type="radio"
									value={role}
								/>
								<span className={canChangeRole(role) ? "" : "text-app-gray-400"}>{role}</span>
							</label>
						))}
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-4">
					<AppButton onClick={onClose} variant="secondary">
						Cancel
					</AppButton>
					<AppButton disabled={selectedRole === member.role} onClick={handleSave}>
						Save Changes
					</AppButton>
				</div>
			</div>
		</BaseModal>
	);
}
