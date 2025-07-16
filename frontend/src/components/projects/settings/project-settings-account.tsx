"use client";

import { Info, Mail, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { deleteUserProfilePhoto, updateUserProfilePhoto } from "@/actions/profile-photo";
import { DeleteAccountModal } from "@/components/projects/settings/delete-account-modal";
import { useNotificationStore } from "@/stores/notification-store";
import { useUserStore } from "@/stores/user-store";
import { UserRole } from "@/types/user";
import { deleteProfilePhoto, getFirebaseAuth, uploadProfilePhoto } from "@/utils/firebase";
import { log } from "@/utils/logger";

interface ProjectSettingsAccountProps {
	projectId: string;
	userRole?: UserRole;
}

export function ProjectSettingsAccount({
	projectId: _projectId,
	userRole = UserRole.MEMBER,
}: ProjectSettingsAccountProps) {
	const { setUser, user } = useUserStore();
	const { addNotification } = useNotificationStore();
	const [name, setName] = useState(user?.displayName ?? "");
	const [showEmailTooltip, setShowEmailTooltip] = useState(false);
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

	const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!(file && user)) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			addNotification({
				message: "Please select an image file (PNG, JPG, or GIF)",
				projectName: "Account Settings",
				title: "Invalid file type",
				type: "warning",
			});
			return;
		}

		// Validate file size (10MB limit)
		if (file.size > 10 * 1024 * 1024) {
			addNotification({
				message: "Please select an image under 10MB",
				projectName: "Account Settings",
				title: "File too large",
				type: "warning",
			});
			return;
		}

		setIsUploading(true);
		try {
			const auth = getFirebaseAuth();
			const { currentUser } = auth;

			if (!currentUser) {
				throw new Error("No authenticated user");
			}

			// Upload photo to Firebase Storage and update profile
			const photoURL = await uploadProfilePhoto(currentUser, file);

			// Update server-side profile
			await updateUserProfilePhoto(photoURL);

			// Update local user store
			setUser({
				...user,
				photoURL,
			});

			addNotification({
				message: "Your profile photo has been successfully updated",
				projectName: "Account Settings",
				title: "Profile photo updated",
				type: "success",
			});
		} catch (error) {
			log.error("Error uploading profile photo", error);
			addNotification({
				message: "Failed to upload profile photo. Please try again.",
				projectName: "Account Settings",
				title: "Upload failed",
				type: "warning",
			});
		} finally {
			setIsUploading(false);
			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handlePhotoDelete = async () => {
		if (!user) return;

		setIsUploading(true);
		try {
			const auth = getFirebaseAuth();
			const { currentUser } = auth;

			if (!currentUser) {
				throw new Error("No authenticated user");
			}

			// Delete photo from Firebase Storage and update profile
			await deleteProfilePhoto(currentUser);

			// Update server-side profile
			await deleteUserProfilePhoto();

			// Update local user store
			setUser({
				...user,
				photoURL: null,
			});

			addNotification({
				message: "Your profile photo has been successfully removed",
				projectName: "Account Settings",
				title: "Profile photo removed",
				type: "success",
			});
		} catch (error) {
			log.error("Error deleting profile photo", error);
			addNotification({
				message: "Failed to delete profile photo. Please try again.",
				projectName: "Account Settings",
				title: "Delete failed",
				type: "warning",
			});
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<>
			<div className="flex flex-col gap-6 px-6 max-w-[340px]" data-testid="project-settings-account">
				{}
				<div className="flex flex-col gap-3">
					<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">
						Profile Image
					</h3>
					<div className="flex items-end gap-3">
						<div
							className="size-[93px] rounded bg-[#369e94] flex items-center justify-center relative overflow-hidden"
							data-testid="profile-image-container"
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
								data-testid="upload-photo-button"
								disabled={isUploading}
								onClick={() => fileInputRef.current?.click()}
								type="button"
							>
								<Plus className="size-4" />
								{isUploading ? "Uploading..." : "Upload"}
							</button>
							<button
								className="p-1 rounded-sm hover:bg-app-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								data-testid="delete-photo-button"
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

				{}
				<div className="flex flex-col gap-3">
					<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">Name</h3>
					<input
						className="w-full h-10 px-3 border border-app-gray-600 rounded bg-white text-[14px] font-body text-app-gray-600 focus:outline-none focus:border-primary"
						data-testid="name-input"
						onChange={(e) => {
							setName(e.target.value);
						}}
						placeholder="Name Name"
						type="text"
						value={name}
					/>
				</div>

				{}
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-1 relative">
						<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">
							Email address
						</h3>
						<button
							className="relative"
							data-testid="email-info-button"
							onMouseEnter={() => {
								setShowEmailTooltip(true);
							}}
							onMouseLeave={() => {
								setShowEmailTooltip(false);
							}}
							type="button"
						>
							<Info className="size-3 text-app-gray-600" />
						</button>
						{showEmailTooltip && (
							<div className="absolute left-0 top-6 z-10 w-[300px]" data-testid="email-tooltip">
								<div className="bg-app-dark-blue text-white text-[14px] font-body px-3 py-1 rounded-sm">
									The main email address cannot be edited.
									<br />
									To change it, please contact our support team.
								</div>
								<div className="flex justify-start ml-4">
									<div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-app-dark-blue" />
								</div>
							</div>
						)}
					</div>
					<div className="relative">
						<input
							className="w-full h-10 px-3 pr-10 border border-app-gray-600 rounded bg-white text-[14px] font-body text-app-gray-600 cursor-not-allowed"
							data-testid="email-input"
							disabled
							type="email"
							value={user?.email ?? "Email@address.com"}
						/>
						<Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-app-gray-600" />
					</div>
				</div>

				{}
				<div className="flex flex-col gap-3">
					<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">Role</h3>
					<div className="inline-flex">
						<span
							className="px-2 py-0 bg-app-gray-100 rounded-[20px] text-[12px] font-body text-app-dark-blue"
							data-testid="role-badge"
						>
							{getRoleLabel(userRole)}
						</span>
					</div>
				</div>

				{}
				{userRole === UserRole.OWNER && (
					<div className="flex flex-col gap-3">
						<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">
							Delete account
						</h3>
						<button
							className="flex items-center gap-1 px-1 py-0.5 border border-error rounded bg-white text-error font-button text-[14px] hover:bg-error hover:text-white transition-colors self-start"
							data-testid="delete-account-button"
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
