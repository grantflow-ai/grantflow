"use client";

import { Info, Mail, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { DeleteAccountModal } from "@/components/projects/settings/delete-account-modal";
import { useUserStore } from "@/stores/user-store";
import { UserRole } from "@/types/user";

interface ProjectSettingsAccountProps {
	projectId: string;
	userRole?: UserRole;
}

export function ProjectSettingsAccount({
	projectId: _projectId,
	userRole = UserRole.MEMBER,
}: ProjectSettingsAccountProps) {
	const { user } = useUserStore();
	const [name, setName] = useState(user?.displayName ?? "");
	const [showEmailTooltip, setShowEmailTooltip] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	const getInitials = () => {
		if (user?.displayName) {
			return user.displayName
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2);
		}
		if (user?.email) {
			return user.email.slice(0, 2).toUpperCase();
		}
		return "U";
	};

	const getRoleLabel = (role: UserRole): string => {
		switch (role) {
			case UserRole.ADMIN: {
				return "Admin";
			}
			case UserRole.MEMBER: {
				return "Collaborator";
			}
			case UserRole.OWNER: {
				return "Owner";
			}
			default: {
				return "Collaborator";
			}
		}
	};

	return (
		<>
			<div className="flex flex-col gap-6 px-6 max-w-[340px]">
				{/* Profile Image */}
				<div className="flex flex-col gap-3">
					<h3 className="font-['Cabin'] font-semibold text-[16px] leading-[22px] text-[#2e2d36]">
						Profile Image
					</h3>
					<div className="flex items-end gap-3">
						<div className="size-[93px] rounded bg-[#369e94] flex items-center justify-center relative overflow-hidden">
							{user?.photoURL ? (
								<Image alt="Profile" className="rounded object-cover" fill src={user.photoURL} />
							) : (
								<span className="font-['Cabin'] font-medium text-[22px] text-white">
									{getInitials()}
								</span>
							)}
						</div>
						<div className="flex gap-1">
							<button
								className="flex items-center gap-1 px-1 py-0.5 border border-[#1e13f8] rounded bg-white text-[#1e13f8] font-['Sora'] text-[14px] hover:bg-[#1e13f8] hover:text-white transition-colors"
								type="button"
							>
								<Plus className="size-4" />
								Upload
							</button>
							<button className="p-1 rounded-sm hover:bg-[#e1dfeb] transition-colors" type="button">
								<Trash2 className="size-4 text-[#ff456d]" />
							</button>
						</div>
					</div>
					<p className="text-[14px] text-[#4a4855] font-['Source_Sans_Pro']">
						We support PNG&apos;s, JPG&apos;s, GIF&apos;s under 10MB
					</p>
				</div>

				{/* Name */}
				<div className="flex flex-col gap-3">
					<h3 className="font-['Cabin'] font-semibold text-[16px] leading-[22px] text-[#2e2d36]">Name</h3>
					<input
						className="w-full h-10 px-3 border border-[#636170] rounded bg-white text-[14px] font-['Source_Sans_Pro'] text-[#636170] focus:outline-none focus:border-[#1e13f8]"
						onChange={(e) => {
							setName(e.target.value);
						}}
						placeholder="Name Name"
						type="text"
						value={name}
					/>
				</div>

				{/* Email */}
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-1 relative">
						<h3 className="font-['Cabin'] font-semibold text-[16px] leading-[22px] text-[#2e2d36]">
							Email address
						</h3>
						<button
							className="relative"
							onMouseEnter={() => {
								setShowEmailTooltip(true);
							}}
							onMouseLeave={() => {
								setShowEmailTooltip(false);
							}}
							type="button"
						>
							<Info className="size-3 text-[#636170]" />
						</button>
						{showEmailTooltip && (
							<div className="absolute left-0 top-6 z-10 w-[300px]">
								<div className="bg-[#211968] text-white text-[14px] font-['Source_Sans_Pro'] px-3 py-1 rounded-sm">
									The main email address cannot be edited.
									<br />
									To change it, please contact our support team.
								</div>
								<div className="flex justify-start ml-4">
									<div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-[#211968]" />
								</div>
							</div>
						)}
					</div>
					<div className="relative">
						<input
							className="w-full h-10 px-3 pr-10 border border-[#636170] rounded bg-white text-[14px] font-['Source_Sans_Pro'] text-[#636170] cursor-not-allowed"
							disabled
							type="email"
							value={user?.email ?? "Email@address.com"}
						/>
						<Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#636170]" />
					</div>
				</div>

				{/* Role */}
				<div className="flex flex-col gap-3">
					<h3 className="font-['Cabin'] font-semibold text-[16px] leading-[22px] text-[#2e2d36]">Role</h3>
					<div className="inline-flex">
						<span className="px-2 py-0 bg-[#e1dfeb] rounded-[20px] text-[12px] font-['Source_Sans_Pro'] text-[#211968]">
							{getRoleLabel(userRole)}
						</span>
					</div>
				</div>

				{/* Delete Account - Only show for owners */}
				{userRole === UserRole.OWNER && (
					<div className="flex flex-col gap-3">
						<h3 className="font-['Cabin'] font-semibold text-[16px] leading-[22px] text-[#2e2d36]">
							Delete account
						</h3>
						<button
							className="flex items-center gap-1 px-1 py-0.5 border border-[#ff456d] rounded bg-white text-[#ff456d] font-['Sora'] text-[14px] hover:bg-[#ff456d] hover:text-white transition-colors self-start"
							onClick={() => {
								setShowDeleteModal(true);
							}}
							type="button"
						>
							<Trash2 className="size-4" />
							Delete account
						</button>
					</div>
				)}
			</div>

			<DeleteAccountModal
				isOpen={showDeleteModal}
				onClose={() => {
					setShowDeleteModal(false);
				}}
			/>
		</>
	);
}
