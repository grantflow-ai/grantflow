import { ChevronDown, ChevronUp, Mail, X } from "lucide-react";
import { useState } from "react";

import { BaseModal } from "@/components/app/feedback/base-modal";

interface InviteCollaboratorModalProps {
	isOpen: boolean;
	onClose: () => void;
	onInvite: (email: string, permission: "admin" | "collaborator") => Promise<void>;
}

export function InviteCollaboratorModal({ isOpen, onClose, onInvite }: InviteCollaboratorModalProps) {
	const [email, setEmail] = useState("");
	const [permission, setPermission] = useState<"admin" | "collaborator">("collaborator");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
		setIsDropdownOpen(false);
		onClose();
	};

	return (
		<BaseModal isOpen={isOpen} onClose={handleClose}>
			<div className="flex flex-col gap-8 p-8 w-[464px]" data-testid="invite-collaborator-modal">
				{}
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<h2 className="font-heading font-medium text-[24px] leading-[30px] text-text-primary">
							Invite New Collaborator
						</h2>
						<button
							aria-label="Close modal"
							className="absolute right-4 top-4 flex size-4 items-center justify-center text-text-secondary hover:text-text-primary"
							data-testid="close-button"
							onClick={handleClose}
							type="button"
						>
							<X className="size-4" />
						</button>
					</div>
					<p className="font-body text-[16px] leading-[20px] text-text-secondary w-[360px]">
						Invite new collaborator and set up collaborator role.
					</p>
				</div>

				{}
				<div className="flex flex-col gap-6 w-full">
					{}
					<div className="flex flex-col gap-1">
						<label
							className="font-body text-[12px] leading-[14px] text-app-gray-400"
							htmlFor="collaborator-email"
						>
							Email address
						</label>
						<div className="relative flex items-center">
							<input
								className="w-full h-10 pl-3 pr-10 border border-border-primary rounded bg-surface-primary font-body text-[14px] text-text-secondary placeholder-app-gray-400 outline-none focus:border-primary"
								data-testid="email-input"
								id="collaborator-email"
								onChange={(e) => {
									setEmail(e.target.value);
								}}
								placeholder="Enter the collaborator email address"
								type="email"
								value={email}
							/>
							<Mail className="absolute right-3 size-4 text-app-gray-400" />
						</div>
					</div>

					{}
					<div className="flex flex-col gap-1">
						<label
							className="font-body text-[12px] leading-[14px] text-app-gray-400"
							htmlFor="collaborator-permission"
						>
							Permission
						</label>
						<div className="relative">
							<button
								className="w-full h-10 px-3 border border-primary rounded bg-surface-primary font-body text-[14px] text-text-secondary text-left flex items-center justify-between outline-none"
								data-testid="permission-dropdown"
								id="collaborator-permission"
								onClick={() => {
									setIsDropdownOpen(!isDropdownOpen);
								}}
								type="button"
							>
								<span>
									{permission === "collaborator"
										? "Collaborator (can access applications within this project)"
										: "Admin (can access all research projects)"}
								</span>
								{isDropdownOpen ? (
									<ChevronUp className="size-4 text-text-secondary" />
								) : (
									<ChevronDown className="size-4 text-text-secondary" />
								)}
							</button>

							{}
							{isDropdownOpen && (
								<div
									className="absolute top-full left-0 right-0 mt-[-1px] bg-surface-primary border border-border-primary rounded shadow-lg z-10"
									data-testid="permission-dropdown-menu"
								>
									<button
										className="w-full px-3 py-3 text-left font-body text-[16px] leading-[20px] text-text-primary hover:bg-surface-secondary transition-colors"
										data-testid="admin-option"
										onClick={() => {
											setPermission("admin");
											setIsDropdownOpen(false);
										}}
										type="button"
									>
										Admin (can access all research projects)
									</button>
									<button
										className="w-full px-3 py-3 text-left font-body text-[16px] leading-[20px] text-text-primary hover:bg-surface-secondary transition-colors"
										data-testid="collaborator-option"
										onClick={() => {
											setPermission("collaborator");
											setIsDropdownOpen(false);
										}}
										type="button"
									>
										Collaborator (can access applications within this project)
									</button>
								</div>
							)}
						</div>
					</div>
				</div>

				{}
				<div className="flex items-center justify-between">
					<button
						className="px-4 py-2 border border-primary rounded bg-surface-primary font-button text-[16px] leading-[22px] text-primary hover:bg-surface-secondary transition-colors"
						data-testid="cancel-button"
						onClick={handleClose}
						type="button"
					>
						Cancel
					</button>
					<button
						className="px-4 py-2 bg-primary rounded font-button text-[16px] leading-[22px] text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
						data-testid="send-invitation-button"
						disabled={!email || isSubmitting}
						onClick={handleSubmit}
						type="button"
					>
						Send Invitation
					</button>
				</div>
			</div>
		</BaseModal>
	);
}
