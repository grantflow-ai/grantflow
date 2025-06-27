"use client";

import { ChevronDown, ChevronUp, Mail, X } from "lucide-react";
import { useState } from "react";

import { BaseModal } from "@/components/ui/base-modal";

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
			// Error handling will be implemented with proper error notifications
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
			<div className="flex flex-col gap-8 p-8 w-[464px]">
				{/* Header */}
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<h2 className="font-['Cabin'] font-medium text-[24px] leading-[30px] text-[#2e2d36]">
							Invite New Collaborator
						</h2>
						<button
							className="absolute right-4 top-4 flex size-4 items-center justify-center text-[#636170] hover:text-[#2e2d36]"
							onClick={handleClose}
							type="button"
						>
							<X className="size-4" />
						</button>
					</div>
					<p className="font-['Source_Sans_Pro'] text-[16px] leading-[20px] text-[#636170] w-[360px]">
						Invite new collaborator and set up collaborator role.
					</p>
				</div>

				{/* Form */}
				<div className="flex flex-col gap-6 w-full">
					{/* Email Input */}
					<div className="flex flex-col gap-1">
						<label
							className="font-['Source_Sans_Pro'] text-[12px] leading-[14px] text-[#aaa8b9]"
							htmlFor="collaborator-email"
						>
							Email address
						</label>
						<div className="relative flex items-center">
							<input
								className="w-full h-10 pl-3 pr-10 border border-[#e1dfeb] rounded bg-white font-['Source_Sans_Pro'] text-[14px] text-[#636170] placeholder-[#aaa8b9] outline-none focus:border-[#1e13f8]"
								id="collaborator-email"
								onChange={(e) => {
									setEmail(e.target.value);
								}}
								placeholder="Enter the collaborator email address"
								type="email"
								value={email}
							/>
							<Mail className="absolute right-3 size-4 text-[#aaa8b9]" />
						</div>
					</div>

					{/* Permission Dropdown */}
					<div className="flex flex-col gap-1">
						<label
							className="font-['Source_Sans_Pro'] text-[12px] leading-[14px] text-[#aaa8b9]"
							htmlFor="collaborator-permission"
						>
							Permission
						</label>
						<div className="relative">
							<button
								className="w-full h-10 px-3 border border-[#1e13f8] rounded bg-white font-['Source_Sans_Pro'] text-[14px] text-[#636170] text-left flex items-center justify-between outline-none"
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
									<ChevronUp className="size-4 text-[#636170]" />
								) : (
									<ChevronDown className="size-4 text-[#636170]" />
								)}
							</button>

							{/* Dropdown Menu */}
							{isDropdownOpen && (
								<div className="absolute top-full left-0 right-0 mt-[-1px] bg-white border border-[#e1dfeb] rounded shadow-lg z-10">
									<button
										className="w-full px-3 py-3 text-left font-['Source_Sans_Pro'] text-[16px] leading-[20px] text-[#2e2d36] hover:bg-[#faf9fb] transition-colors"
										onClick={() => {
											setPermission("admin");
											setIsDropdownOpen(false);
										}}
										type="button"
									>
										Admin (can access all research projects)
									</button>
									<button
										className="w-full px-3 py-3 text-left font-['Source_Sans_Pro'] text-[16px] leading-[20px] text-[#2e2d36] hover:bg-[#faf9fb] transition-colors"
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

				{/* Buttons */}
				<div className="flex items-center justify-between">
					<button
						className="px-4 py-2 border border-[#1e13f8] rounded bg-white font-['Sora'] text-[16px] leading-[22px] text-[#1e13f8] hover:bg-[#f6f5f9] transition-colors"
						onClick={handleClose}
						type="button"
					>
						Cancel
					</button>
					<button
						className="px-4 py-2 bg-[#1e13f8] rounded font-['Sora'] text-[16px] leading-[22px] text-white hover:bg-[#1710d4] transition-colors disabled:opacity-50"
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