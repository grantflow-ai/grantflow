"use client";

import { ChevronDown, Mail, X } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CollaboratorPermission = "admin" | "collaborator";

interface InviteCollaboratorModalProps {
	isOpen: boolean;
	onClose: () => void;
	onInvite: (
		email: string,
		permission: CollaboratorPermission,
		hasAllProjectsAccess?: boolean,
		projectIds?: string[],
	) => Promise<void>;
}

export function InviteCollaboratorModal({ isOpen, onClose, onInvite }: InviteCollaboratorModalProps) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [permission, setPermission] = useState<CollaboratorPermission>("collaborator");
	const [projectAccess, setProjectAccess] = useState("all");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async () => {
		if (!email) return;

		setIsSubmitting(true);
		try {
			const hasAllProjectsAccess = permission === "admin" || projectAccess === "all";

			// TODO: Implement project selection for specific projects
			const projectIds: string[] = [];

			// TODO: Add name field to API when backend supports it

			await onInvite(email, permission, hasAllProjectsAccess, projectIds);
			setName("");
			setEmail("");
			setPermission("collaborator");
			setProjectAccess("all");
			onClose();
		} catch {
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		setName("");
		setEmail("");
		setPermission("collaborator");
		setProjectAccess("all");
		onClose();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			handleClose();
		}
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={isOpen}>
			<DialogContent
				className="w-[511px] p-0 bg-white border border-primary rounded-lg overflow-hidden"
				data-testid="invite-collaborator-modal"
			>
				<div className="p-8 flex flex-col gap-8">
					{}
					<div className="flex flex-col gap-3">
						<div className="flex items-start justify-between">
							<div className="flex flex-col gap-1">
								<DialogTitle className="font-heading font-medium text-[24px] leading-[30px] text-app-black">
									Invite New Member
								</DialogTitle>
								<DialogDescription className="font-body text-[16px] text-app-gray-600">
									Invite new member and set up member role.
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
								className="w-full h-10 px-3 border border-app-gray-300 rounded bg-white font-body text-[14px] text-app-gray-600 placeholder:text-app-gray-400 outline-none focus:border-primary"
								data-testid="name-input"
								id="member-name"
								onChange={(e) => {
									setName(e.target.value);
								}}
								placeholder="Name Name"
								type="text"
								value={name}
							/>
						</div>

						{}
						<div className="flex flex-col gap-1">
							<label className="font-body text-[12px] text-app-gray-400" htmlFor="member-email">
								Email address
							</label>
							<div className="relative">
								<input
									className="w-full h-10 px-3 pr-10 border border-app-gray-300 rounded bg-white font-body text-[14px] text-app-gray-600 placeholder:text-app-gray-400 outline-none focus:border-primary"
									data-testid="email-input"
									id="member-email"
									onChange={(e) => {
										setEmail(e.target.value);
									}}
									placeholder="email@address.com"
									type="email"
									value={email}
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
								onValueChange={(value: "admin" | "collaborator") => {
									setPermission(value);
								}}
								value={permission}
							>
								<SelectTrigger
									className="w-full h-10 px-3 border border-app-gray-300 rounded bg-white font-body text-[14px] text-app-gray-600 outline-none data-[state=open]:border-primary"
									data-testid="permission-dropdown"
									id="member-permission"
								>
									<SelectValue placeholder="Select permission" />
									<ChevronDown className="size-4 text-app-gray-600" />
								</SelectTrigger>
								<SelectContent
									className="border border-app-gray-200 bg-white"
									data-testid="permission-dropdown-menu"
								>
									<SelectItem
										className="px-3 py-2 cursor-pointer hover:bg-app-gray-50 focus:bg-app-gray-50 text-app-black text-[14px]"
										data-testid="collaborator-option"
										value="collaborator"
									>
										Collaborator
									</SelectItem>
									<SelectItem
										className="px-3 py-2 cursor-pointer hover:bg-app-gray-50 focus:bg-app-gray-50 text-app-black text-[14px]"
										data-testid="admin-option"
										value="admin"
									>
										Admin
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{}
						{permission === "collaborator" && (
							<div className="flex flex-col gap-3">
								<div className="flex items-center gap-2">
									<div className="px-2 py-1 bg-primary rounded-full text-white text-[12px] font-body">
										+ Project name
									</div>
									<div className="px-2 py-1 bg-primary rounded-full text-white text-[12px] font-body">
										+ Project name
									</div>
								</div>
								<label className="font-body text-[12px] text-app-gray-400" htmlFor="project-access">
									Research Projects Access
								</label>
								<Select onValueChange={setProjectAccess} value={projectAccess}>
									<SelectTrigger
										className="w-full h-10 px-3 border border-app-gray-300 rounded bg-white font-body text-[14px] text-app-gray-600 outline-none data-[state=open]:border-primary"
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
											All Projects
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
						<div className="flex items-start gap-2 p-3 bg-app-gray-50 rounded">
							<div className="size-4 bg-warning rounded-full flex-shrink-0 mt-0.5" />
							<p className="font-body text-[14px] text-app-gray-700">
								Removing research project permission will revoke access. The user will no longer be able
								to view or edit content.
							</p>
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
							data-testid="send-invitation-button"
							disabled={!email || isSubmitting}
							onClick={handleSubmit}
							type="button"
						>
							{isSubmitting ? "Inviting..." : "Invite"}
						</button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
