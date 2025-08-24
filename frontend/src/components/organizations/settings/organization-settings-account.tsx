"use client";

import { Info, Mail, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserStore } from "@/stores";
import { UserRole } from "@/types/user";
import { log } from "@/utils/logger/client";
import { DeleteAccountModal } from "./delete-account-modal";

interface OrganizationSettingsAccountProps {
	organizationId: string;
	userRole?: UserRole;
}

export function OrganizationSettingsAccount({
	organizationId: _organizationId,
	userRole = UserRole.COLLABORATOR,
}: OrganizationSettingsAccountProps) {
	const { deleteProfilePhoto, updateProfilePhoto, user } = useUserStore();
	const [name, setName] = useState(user?.displayName ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

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
			case UserRole.COLLABORATOR: {
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

	const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!(file && user)) return;

		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file (PNG, JPG, or GIF)");
			return;
		}

		if (file.size > 10 * 1024 * 1024) {
			toast.error("Please select an image under 10MB");
			return;
		}

		setIsUploading(true);
		try {
			await updateProfilePhoto(file);
			toast.success("Profile photo updated successfully");
		} catch (error) {
			log.error("Error uploading profile photo", error);
			toast.error("Failed to upload profile photo");
		} finally {
			setIsUploading(false);

			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handlePhotoDelete = async () => {
		if (!user) return;

		setIsUploading(true);
		try {
			await deleteProfilePhoto();
			toast.success("Profile photo removed successfully");
		} catch (error) {
			log.error("Error deleting profile photo", error);
			toast.error("Failed to delete profile photo");
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<>
			<div className="flex flex-col gap-6 px-6 max-w-[340px]" data-testid="organization-settings-account">
				<div className="flex flex-col gap-3">
					<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">
						Profile Image
					</h3>
					<div className="flex items-end gap-3">
						<div
							className="size-[93px] rounded bg-[#369e94] flex items-center justify-center relative overflow-hidden"
							data-testid="organization-profile-image-container"
						>
							{user?.photoURL ? (
								<Image alt="Profile" className="rounded object-cover" fill src={user.photoURL} />
							) : (
								<span className="font-heading font-medium text-[22px] text-white">{getInitials()}</span>
							)}
						</div>
						<div className="flex gap-1">
							<input
								accept="image/*"
								className="hidden"
								disabled={isUploading}
								onChange={handlePhotoUpload}
								ref={fileInputRef}
								type="file"
							/>
							<button
								className="flex items-center gap-1 px-1 py-0.5 border border-primary rounded bg-white text-primary font-button text-[14px] hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								data-testid="organization-upload-photo-button"
								disabled={isUploading}
								onClick={() => fileInputRef.current?.click()}
								type="button"
							>
								<Plus className="size-4" />
								{isUploading ? "Uploading..." : "Upload"}
							</button>
							<button
								className="p-1 rounded-sm hover:bg-app-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								data-testid="organization-delete-photo-button"
								disabled={isUploading || !user?.photoURL}
								onClick={handlePhotoDelete}
								type="button"
							>
								<Trash2 className="size-4 text-error" />
							</button>
						</div>
					</div>
					<p className="text-[14px] text-app-gray-700 font-body">
						We support PNG&apos;s, JPG&apos;s, GIF&apos;s under 10MB
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">Name</h3>
					<input
						className="w-full h-10 px-3 border border-app-gray-600 rounded bg-white text-[14px] font-body text-app-gray-600 focus:outline-none focus:border-primary"
						data-testid="organization-name-input"
						onChange={(e) => {
							setName(e.target.value);
						}}
						placeholder="Name Name"
						type="text"
						value={name}
					/>
				</div>

				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-1">
						<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">
							Email address
						</h3>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										className="relative"
										data-testid="organization-email-info-button"
										type="button"
									>
										<Info className="size-3 text-app-gray-600" />
									</button>
								</TooltipTrigger>
								<TooltipContent className="bg-app-dark-blue text-white font-normal text-sm rounded-sm">
									<p>The main email address cannot be edited.</p>
									<p>To change it, please contact our support team.</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<div className="relative">
						<input
							className="w-full h-10 px-3 pr-10 border border-app-gray-600 rounded bg-white text-[14px] font-body text-app-gray-600 focus:outline-none focus:border-primary"
							data-testid="organization-email-input"
							onChange={(e) => {
								setEmail(e.target.value);
							}}
							placeholder="email@example.com"
							type="email"
							value={email}
						/>
						<Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-app-gray-600" />
					</div>
				</div>

				<div className="flex flex-col gap-3">
					<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">Role</h3>
					<div className="inline-flex">
						<span
							className="px-2 py-0 bg-app-gray-100 rounded-[20px] text-[12px] font-body text-app-dark-blue"
							data-testid="organization-role-badge"
						>
							{getRoleLabel(userRole)}
						</span>
					</div>
				</div>

				{userRole === UserRole.OWNER && (
					<div className="flex flex-col gap-3">
						<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">
							Delete account
						</h3>
						<button
							className="flex items-center gap-1 px-1 py-0.5 border border-error rounded bg-white text-error font-button text-[14px] hover:bg-error hover:text-white transition-colors self-start"
							data-testid="organization-delete-account-button"
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
