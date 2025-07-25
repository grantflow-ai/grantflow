"use client";

import { ChevronDown, Mail, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserRole } from "@/types/user";

interface EditPermissionModalProps {
	currentUserRole: UserRole;
	isOpen: boolean;
	member: null | OrganizationMember;
	onClose: () => void;
	onUpdateRole: (firebaseUid: string, newRole: UserRole, hasAllProjectsAccess?: boolean) => void;
}

interface OrganizationMember {
	displayName?: string;
	email?: string;
	firebaseUid: string;
	hasAllProjectsAccess?: boolean;
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
	const [projectAccess, setProjectAccess] = useState("all");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (member) {
			setSelectedRole(member.role);

			setProjectAccess((member.hasAllProjectsAccess ?? true) ? "all" : "specific");
		}
	}, [member]);

	const handleSubmit = () => {
		if (!member) return;

		setIsSubmitting(true);
		try {
			const hasAllProjectsAccess = selectedRole !== UserRole.COLLABORATOR || projectAccess === "all";

			onUpdateRole(member.firebaseUid, selectedRole, hasAllProjectsAccess);
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		if (member) {
			setSelectedRole(member.role);
			setProjectAccess((member.hasAllProjectsAccess ?? true) ? "all" : "specific");
		}
		onClose();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			handleClose();
		}
	};

	const canChangeRole = (targetRole: UserRole) => {
		return (
			currentUserRole === UserRole.OWNER || (currentUserRole === UserRole.ADMIN && targetRole !== UserRole.OWNER)
		);
	};

	const showAllTag = selectedRole === UserRole.OWNER || selectedRole === UserRole.ADMIN;

	if (!member) return null;

	return (
		<Dialog onOpenChange={handleOpenChange} open={isOpen}>
			<DialogContent
				className="w-[464px] p-0 bg-white border border-primary rounded-lg overflow-hidden"
				data-testid="edit-permission-modal"
			>
				<div className="p-8 flex flex-col gap-8">
					{}
					<div className="flex flex-col gap-2">
						<div className="flex items-start justify-between">
							<div className="flex flex-col gap-1">
								<DialogTitle className="font-heading font-medium text-[24px] leading-[30px] text-app-black">
									Edit Member Details
								</DialogTitle>
								<DialogDescription className="font-body text-[16px] text-app-gray-600 max-w-[360px]">
									Control access and permission levels across research projects.
								</DialogDescription>
							</div>
							<button
								className="p-0 hover:bg-app-gray-50 rounded transition-colors"
								onClick={handleClose}
								type="button"
							>
								<X className="size-4 text-app-gray-700" />
							</button>
						</div>
					</div>

					{}
					<div className="flex flex-col gap-6">
						{}
						<div className="flex flex-col gap-1">
							<label className="font-body text-[12px] text-app-gray-400" htmlFor="member-name">
								Name
							</label>
							<input
								className="w-full h-10 px-3 border border-app-gray-600 rounded bg-white font-body text-[14px] text-app-gray-600 outline-none cursor-not-allowed"
								data-testid="name-input"
								id="member-name"
								readOnly
								type="text"
								value={member.displayName ?? "Name Name"}
							/>
						</div>

						{}
						<div className="flex flex-col gap-1">
							<label className="font-body text-[12px] text-app-gray-400" htmlFor="member-email">
								Email address
							</label>
							<div className="relative">
								<input
									className="w-full h-10 px-3 pr-10 border border-app-gray-600 rounded bg-white font-body text-[14px] text-app-gray-600 outline-none cursor-not-allowed"
									data-testid="email-input"
									id="member-email"
									readOnly
									type="email"
									value={member.email ?? "email@address.com"}
								/>
								<Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-app-gray-600" />
							</div>
						</div>

						{}
						<div className="flex flex-col gap-1">
							<label className="font-body text-[12px] text-app-gray-400" htmlFor="member-permission">
								Permission
							</label>
							<Select
								disabled={!canChangeRole(selectedRole)}
								onValueChange={(value: UserRole) => {
									if (canChangeRole(value)) {
										setSelectedRole(value);
									}
								}}
								value={selectedRole}
							>
								<SelectTrigger
									className="w-full h-10 px-3 border border-app-gray-600 rounded bg-white font-body text-[14px] text-app-gray-600 outline-none data-[state=open]:border-primary disabled:cursor-not-allowed disabled:opacity-60"
									data-testid="permission-dropdown"
									id="member-permission"
								>
									<SelectValue placeholder="Select permission" />
									<ChevronDown className="size-4 text-app-gray-600" />
								</SelectTrigger>
								<SelectContent className="border border-app-gray-200 bg-white">
									<SelectItem
										className="px-3 py-2 cursor-pointer hover:bg-app-gray-50 focus:bg-app-gray-50 text-app-black text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
										disabled={!canChangeRole(UserRole.COLLABORATOR)}
										value={UserRole.COLLABORATOR}
									>
										Collaborator
									</SelectItem>
									<SelectItem
										className="px-3 py-2 cursor-pointer hover:bg-app-gray-50 focus:bg-app-gray-50 text-app-black text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
										disabled={!canChangeRole(UserRole.ADMIN)}
										value={UserRole.ADMIN}
									>
										Admin
									</SelectItem>
									<SelectItem
										className="px-3 py-2 cursor-pointer hover:bg-app-gray-50 focus:bg-app-gray-50 text-app-black text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
										disabled={!canChangeRole(UserRole.OWNER)}
										value={UserRole.OWNER}
									>
										Owner
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{}
						<div className="flex flex-col gap-2">
							{}
							{showAllTag && (
								<div className="flex flex-row gap-1 items-start justify-start w-[180px]">
									<div className="bg-primary flex flex-row gap-1 items-center justify-start px-2 py-0 rounded-[20px]">
										<X className="size-3 text-white" />
										<span className="font-body text-[12px] text-white">All</span>
									</div>
								</div>
							)}

							{}
							{selectedRole === UserRole.COLLABORATOR && (
								<div className="flex flex-col gap-1">
									<label className="font-body text-[12px] text-app-gray-400" htmlFor="project-access">
										Research Projects Access
									</label>
									<Select onValueChange={setProjectAccess} value={projectAccess}>
										<SelectTrigger
											className="w-full h-10 px-3 border border-app-gray-600 rounded bg-white font-body text-[14px] text-app-gray-600 outline-none data-[state=open]:border-primary"
											data-testid="project-access-dropdown"
											id="project-access"
										>
											<SelectValue placeholder="Select project access" />
											<ChevronDown className="size-4 text-app-gray-600" />
										</SelectTrigger>
										<SelectContent className="border border-app-gray-200 bg-white">
											<SelectItem
												className="px-3 py-2 cursor-pointer hover:bg-app-gray-50 focus:bg-app-gray-50 text-app-black text-[14px]"
												value="all"
											>
												All
											</SelectItem>
											<SelectItem
												className="px-3 py-2 cursor-pointer hover:bg-app-gray-50 focus:bg-app-gray-50 text-app-black text-[14px]"
												value="specific"
											>
												Specific Projects
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}

							{}
							<div className="flex items-start gap-2 p-3 bg-[#faf6ec] border border-[#ffdf77] rounded">
								<div className="size-4 bg-warning rounded-full flex-shrink-0 mt-0.5" />
								<p className="font-body text-[14px] text-app-black">
									Removing research project permission will revoke access. The user will no longer be
									able to view or edit content.
								</p>
							</div>
						</div>
					</div>

					{}
					<div className="flex items-center justify-between">
						<button
							className="px-4 py-2 border border-primary rounded bg-white text-primary font-button text-[16px] hover:bg-app-gray-50 transition-colors"
							data-testid="cancel-button"
							onClick={handleClose}
							type="button"
						>
							Cancel
						</button>
						<button
							className="px-4 py-2 bg-primary text-white rounded font-button text-[16px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							data-testid="update-button"
							disabled={isSubmitting || selectedRole === member.role}
							onClick={handleSubmit}
							type="button"
						>
							{isSubmitting ? "Updating..." : "Update"}
						</button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
