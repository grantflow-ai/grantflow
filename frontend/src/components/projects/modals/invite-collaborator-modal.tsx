"use client";

import { Mail } from "lucide-react";
import { useState } from "react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppButton } from "@/components/app";

type CollaboratorPermission = "admin" | "collaborator" | "owner";

interface InviteCollaboratorModalProps {
	isOpen: boolean;
	onClose: () => void;
	onInvite: (email: string, permission: CollaboratorPermission) => Promise<void>;
}

export function InviteCollaboratorModal({ isOpen, onClose, onInvite }: InviteCollaboratorModalProps) {
	const [email, setEmail] = useState("");
	const [permission, setPermission] = useState<CollaboratorPermission>("collaborator");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async () => {
		if (!email) return;

		setIsSubmitting(true);
		try {
			await onInvite(email, permission);
			setEmail("");
			setPermission("collaborator");
			onClose();
		} catch {
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		setEmail("");
		setPermission("collaborator");
		onClose();
	};
	const handleOpenChange = (open: boolean) => {
		if (!open) {
			onClose();
		}
	};
	return (
		<>
			<Dialog onOpenChange={handleOpenChange} open={isOpen}>
				<DialogContent className="p-8 w-[464px] h-[492px] flex flex-col gap-8 bg-white [&>button]:cursor-pointer [&>button]:text-black [&>button>svg]:text-black [&>button]:hover:bg-gray-100">
					<DialogHeader className="flex flex-col gap-2 text-left">
						<DialogTitle className="font-medium text-2xl leading-[30px] text-app-black">
							Invite New Member
						</DialogTitle>
						<DialogDescription className="font-body text-[16px] leading-[20px] text-app-gray-600 w-[360px]">
							Invite new member and set up member role.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-6 w-full">
						<div className="flex flex-col">
							<label
								className="font-body text-[12px] leading-[14px] text-app-gray-400"
								htmlFor="collaborator-email"
							>
								Email address
							</label>
							<div className="relative flex items-center">
								<input
									className="w-full h-10 pl-3 pr-10 border border-app-gray-100 rounded bg-white font-body text-[14px] text-app-gray-600 placeholder-app-gray-400 outline-none focus:border-primary"
									data-testid="email-input"
									id="collaborator-email"
									onChange={(e) => {
										setEmail(e.target.value);
									}}
									placeholder="Enter the collaborator email address"
									type="email"
									value={email}
								/>
								<Mail className="absolute right-3 size-4 text-app-gray-700" />
							</div>
						</div>

						<div className="flex flex-col g">
							<label
								className="font-body text-xs leading-[14px] text-app-gray-400 flex items-center justify-between"
								htmlFor="collaborator-permission"
							>
								<p>Access permission</p>
								<p>00/00</p>
							</label>
							<Select
								onValueChange={(value: "admin" | "collaborator" | "owner") => {
									setPermission(value);
								}}
								value={permission}
							>
								<SelectTrigger
									className="w-full h-auto min-h-10 px-3 py-2 text-left border border-primary rounded bg-white font-body text-[14px] text-app-gray-600 flex items-center justify-between outline-none"
									data-testid="permission-dropdown"
									id="collaborator-permission"
								>
									<SelectValue
										className="placeholder:font-normal placeholder:text-sm"
										placeholder="Choose permission level"
									/>
								</SelectTrigger>
								<SelectContent className="[&>*]:p-0 border border-gray-200 w-full shadow-none ">
									<SelectItem
										className="bg-white cursor-pointer text-app-black text-sm font-normal p-3 hover:!bg-preview-bg hover:!text-app-black focus:!bg-preview-bg focus:!text-app-black data-[highlighted]:!bg-preview-bg data-[highlighted]:!text-app-black rounded-none"
										data-testid="select-item-first"
										value="collaborator"
									>
										Collaborator - Can edit specific Research Projects.
									</SelectItem>
									<SelectItem
										className="bg-white cursor-pointer text-app-black text-sm font-normal p-3 hover:!bg-preview-bg hover:!text-app-black focus:!bg-preview-bg focus:!text-app-black data-[highlighted]:!bg-preview-bg data-[highlighted]:!text-app-black rounded-none"
										value="admin"
									>
										Admin - Access to R.projects, payments & members
									</SelectItem>
									<SelectItem
										className="bg-white cursor-pointer text-app-black text-sm font-normal p-3 hover:!bg-preview-bg hover:!text-app-black focus:!bg-preview-bg focus:!text-app-black data-[highlighted]:!bg-preview-bg data-[highlighted]:!text-app-black rounded-none"
										value="owner"
									>
										Owner - Full access
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter className="!mt-auto">
						<div className="flex items-center justify-between w-full">
							<AppButton
								className="rounded px-4 py-2"
								data-testid="cancel-button"
								onClick={handleClose}
								variant="secondary"
							>
								Cancel
							</AppButton>
							<AppButton
								className="rounded px-4 py-2"
								data-testid="send-invitation-button"
								onClick={handleSubmit}
								variant="primary"
							>
								{isSubmitting ? "Sending..." : "Send Invitation"}
							</AppButton>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
