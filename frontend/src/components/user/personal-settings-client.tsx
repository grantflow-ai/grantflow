"use client";

import { signOut } from "firebase/auth";
import { RefreshCw, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { deleteAccount, getSoleOwnedOrganizations, getSoleOwnedProjects } from "@/actions/user";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DeleteAccountModal } from "@/components/user/delete-account-modal";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useNotificationStore } from "@/stores/notification-store";
import { useUserStore } from "@/stores/user-store";
import { getFirebaseAuth } from "@/utils/firebase";
import { generateBackgroundColor, generateInitials } from "@/utils/user";

export function PersonalSettingsClient() {
	const { clearUser, deleteProfilePhoto, updateDisplayName, updateProfilePhoto, user } = useUserStore();
	const { addNotification } = useNotificationStore();
	const [displayName, setDisplayName] = useState(user?.displayName ?? "");
	const [isUploading, setIsUploading] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [email, setEmail] = useState(user?.email ?? "");
	const [isSoleOwner, setIsSoleOwner] = useState(false);

	useEffect(() => {
		if (user) {
			setDisplayName(user.displayName ?? "");
			setEmail(user.email ?? "");
		}
	}, [user]);

	const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file (PNG, JPG, or JPEG)");
			return;
		}

		if (file.size > 10 * 1024 * 1024) {
			toast.error("Please select an image under 10MB");
			return;
		}

		setIsUploading(true);
		try {
			await updateProfilePhoto(file);
			toast.success("Avatar upload successful");
		} catch {
			toast.error("Failed to upload avatar");
		} finally {
			setIsUploading(false);

			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleSave = async () => {
		if (!user || user.displayName === displayName) return;

		try {
			await updateDisplayName(displayName);
			toast.info("User profile updated");
		} catch {
			toast.error("Failed to update profile");
		}
	};

	const handleDeleteAccount = async () => {
		try {
			const [soleOwnedOrgs, soleOwnedProjects] = await Promise.all([
				getSoleOwnedOrganizations(),
				getSoleOwnedProjects(),
			]);

			if (soleOwnedOrgs.count > 0 || soleOwnedProjects.count > 0) {
				let message = "Please transfer ownership first:\n";
				setIsSoleOwner(true);
				if (soleOwnedOrgs.count > 0) {
					message += `• ${soleOwnedOrgs.count} organization(s): ${soleOwnedOrgs.organizations.map((org) => org.name).join(", ")}\n`;
				}
				if (soleOwnedProjects.count > 0) {
					message += `• ${soleOwnedProjects.count} project(s): ${soleOwnedProjects.projects.map((project) => project.name).join(", ")}`;
				}

				addNotification({
					message,
					projectName: "",
					title: "Cannot delete account",
					type: "warning",
				});
				setIsDeleteModalOpen(false);
				return;
			}

			const result = await deleteAccount();

			const auth = getFirebaseAuth();
			await signOut(auth);
			clearUser();

			addNotification({
				message: `${result.message} You have ${result.grace_period_days} days to restore your account if needed.`,
				projectName: "",
				title: "Account scheduled for deletion",
				type: "success",
			});
			setIsDeleteModalOpen(false);
		} catch {
			setIsDeleteModalOpen(false);
		}
	};

	const handleDeletePhoto = async () => {
		setIsUploading(true);
		try {
			await deleteProfilePhoto();
			toast.success("Avatar removed successfully");
		} catch {
			toast.error("Failed to remove avatar");
		} finally {
			setIsUploading(false);
		}
	};

	useAutoSave(handleSave, [displayName]);
	const userInitials = generateInitials(user?.displayName ?? undefined, user?.email ?? undefined);

	const logoButtonClasses = [
		"group",
		"w-[93px]",
		"h-[95px]",
		"rounded",
		"bg-preview-bg",
		"flex",
		"items-center",
		"justify-center",
		"relative",
		"overflow-hidden",
		"transition-colors",
	];

	if (!user?.photoURL) {
		logoButtonClasses.push(
			"border",
			"border-dashed",
			"border-app-gray-100",
			"cursor-pointer",
			"hover:border-primary",
		);
	}

	return (
		<div className="flex flex-col gap-10 max-w-[607px]" data-testid="personal-settings">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-3 px-6">
					<div className="flex flex-col gap-3 w-[340px]">
						<h3 className="font-semibold text-[16px] leading-[22px] text-app-black">Profile Image</h3>
						<div className="flex flex-col gap-3">
							<button
								className={logoButtonClasses.join(" ")}
								data-testid="user-avatar-container"
								onClick={() => {
									if (!user?.photoURL) {
										fileInputRef.current?.click();
									}
								}}
								type="button"
							>
								{user?.photoURL ? (
									<>
										<Image alt="User Avatar" className="object-cover" fill src={user.photoURL} />
										<div className="absolute inset-0 bg-app-black/80 hidden group-hover:flex gap-[9px] justify-center items-center">
											<button
												className="bg-primary size-6 p-1 rounded-xs cursor-pointer"
												onClick={(e) => {
													e.stopPropagation();
													fileInputRef.current?.click();
												}}
												type="button"
											>
												<RefreshCw className="text-white size-4" />
											</button>
											<button
												className="bg-primary size-6 p-1 rounded-xs cursor-pointer"
												onClick={(e) => {
													e.stopPropagation();
													void handleDeletePhoto();
												}}
												type="button"
											>
												<Trash2 className="text-white size-4" />
											</button>
										</div>
									</>
								) : (
									<div
										className="size-full flex items-center justify-center"
										style={{
											backgroundColor: user?.uid ? generateBackgroundColor(user.uid) : "#cccccc",
										}}
									>
										<span className="font-heading font-medium text-[24px] leading-[30px] text-app-black">
											{userInitials}
										</span>
									</div>
								)}
							</button>
							<input
								accept="image/*"
								className="hidden"
								disabled={isUploading}
								onChange={handleAvatarUpload}
								ref={fileInputRef}
								type="file"
							/>
							<p className="text-[14px] text-app-gray-700">We support PNG, JPG, JPEG under 10MB</p>
						</div>
					</div>

					<div className="flex flex-col gap-3 w-[340px]">
						<h3 className="font-semibold text-[16px] leading-[22px] text-app-black">Name</h3>
						<input
							className="w-full h-10 px-3 border rounded text-[14px] font-body text-app-gray-600 placeholder:text-app-gray-400 focus:outline-none focus:border-primary border-app-gray-600 bg-white"
							data-testid="user-name-input"
							onChange={(e) => {
								setDisplayName(e.target.value);
							}}
							placeholder="Name Name"
							type="text"
							value={displayName}
						/>
					</div>

					<div className="flex flex-col gap-3 w-[340px]">
						<div className="flex items-center gap-1">
							<h3 className=" font-semibold text-[16px] leading-[22px] text-app-black">Email address</h3>{" "}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<Image
											alt="email"
											className="object-cover"
											height={10}
											src="/icons/info-blue.svg"
											width={10}
										/>
									</TooltipTrigger>
									<TooltipContent>
										<p className="text-center">
											This email address is associated with your account <br /> credentials and is
											not editable.
										</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<div className="relative">
							<input
								className="w-full h-10 pl-3 pr-10 border border-app-gray-600 rounded bg-white text-[14px] font-body text-app-gray-600 placeholder:text-app-gray-600 focus:outline-none focus:border-primary cursor-not-allowed"
								data-testid="user-email-input"
								disabled
								onChange={(e) => {
									setEmail(e.target.value);
								}}
								placeholder="Email@address.com"
								type="email"
								value={email}
							/>
							<div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-auto">
								<Image
									alt="email"
									className="object-cover"
									height={16}
									src="/icons/email.svg"
									width={16}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="w-full border border-red rounded p-6">
				<div className="flex flex-col gap-6">
					<div className="flex flex-col gap-2">
						<h2 className="font-heading font-medium text-[24px] leading-[30px] text-app-black">
							Danger Zone -Leave Account
						</h2>
						<p className="font-body text-[16px] leading-[20px] text-app-black">
							By leaving this account, your personal data associated with this GrantFlow account and your
							user account under [{user?.email}] will be permanently deleted. You&apos;ll lose access to
							research projects, data, and team collaboration.
						</p>
					</div>

					{isSoleOwner && (
						<div className="flex p-2 justify-between items-center border border-error bg-error/15 rounded">
							<div className="flex gap-1">
								<div className="size-4 ">
									<Image
										alt="email"
										className="object-cover"
										height={16}
										src="/icons/close-circle.svg"
										width={16}
									/>
								</div>
								<p className="font-normal text-sm leading-[18px] text-app-black">
									{" "}
									You’re the only owner of this account. Please assign another owner before leaving.
								</p>
							</div>
							<X
								className="text-app-black size-3 "
								onClick={() => {
									setIsSoleOwner(false);
								}}
							/>
						</div>
					)}

					<div className="flex justify-end">
						<button
							className="px-2 py-1 bg-white border border-red rounded text-red cursor-pointer font-normal text-[14px] leading-[20px]"
							onClick={handleDeleteAccount}
							type="button"
						>
							Leave Account
						</button>
					</div>
				</div>
			</div>

			<DeleteAccountModal
				isOpen={isDeleteModalOpen}
				onClose={() => {
					setIsDeleteModalOpen(false);
				}}
				onConfirm={handleDeleteAccount}
			/>
		</div>
	);
}
