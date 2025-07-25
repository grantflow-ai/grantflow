"use client";

import { signOut } from "firebase/auth";
import { useState } from "react";
import { deleteAccount, getSoleOwnedOrganizations, getSoleOwnedProjects } from "@/actions/user";
import { AppHeader } from "@/components/layout/app-header";
import { useNotificationStore } from "@/stores/notification-store";
import { useUserStore } from "@/stores/user-store";
import { getFirebaseAuth } from "@/utils/firebase";
import { log } from "@/utils/logger";
import { generateInitials } from "@/utils/user";
import { DeleteAccountModal } from "../modals/delete-account-modal";

const EMPTY_TEAM_MEMBERS: never[] = [];

interface PersonalProfileSettingsProps {
	onDeleteAccount: () => void;
	user: {
		displayName: null | string;
		email: null | string;
		photoURL: null | string;
		uid: string;
	};
}

interface PersonalSettingsClientProps {
	activeTab: "notifications" | "profile";
}

interface PersonalSettingsLayoutProps {
	activeTab: "notifications" | "profile";
	children: React.ReactNode;
}

export function PersonalSettingsClient({ activeTab }: PersonalSettingsClientProps) {
	const { clearUser, user } = useUserStore();
	const { addNotification } = useNotificationStore();
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

	if (!user) {
		return null;
	}

	const handleDeleteAccount = async () => {
		try {
			const [soleOwnedOrgs, soleOwnedProjects] = await Promise.all([
				getSoleOwnedOrganizations(),
				getSoleOwnedProjects(),
			]);

			if (soleOwnedOrgs.count > 0 || soleOwnedProjects.count > 0) {
				let message = "Please transfer ownership first:\n";
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

			log.info("Account deletion initiated", {
				gracePeriodDays: result.grace_period_days,
				scheduledDeletionDate: result.scheduled_deletion_date,
			});

			setIsDeleteModalOpen(false);
		} catch (error) {
			log.error("Error deleting account", error);
			addNotification({
				message: "Failed to delete account. Please try again.",
				projectName: "",
				title: "Error",
				type: "warning",
			});
			setIsDeleteModalOpen(false);
		}
	};

	const renderSettingsContent = () => {
		switch (activeTab) {
			case "notifications": {
				return (
					<div className="flex items-center justify-center h-full">
						<p className="text-app-gray-600">Notifications settings coming soon...</p>
					</div>
				);
			}
			case "profile": {
				return (
					<PersonalProfileSettings
						onDeleteAccount={() => {
							setIsDeleteModalOpen(true);
						}}
						user={user}
					/>
				);
			}
		}
	};

	return (
		<div className="relative size-full overflow-y-scroll bg-preview-bg">
			<section className="w-full h-full">
				<main className="w-full h-full flex flex-col">
					<AppHeader projectTeamMembers={EMPTY_TEAM_MEMBERS} />

					<main className="mx-6 mb-6 px-10 relative flex flex-col gap-10 py-14 flex-grow rounded-lg border border-app-gray-100 min-h-0 bg-white">
						<PersonalSettingsLayout activeTab={activeTab}>{renderSettingsContent()}</PersonalSettingsLayout>
					</main>
				</main>
			</section>

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

function PersonalProfileSettings({ onDeleteAccount, user }: PersonalProfileSettingsProps) {
	const [displayName, setDisplayName] = useState(user.displayName ?? "");

	const userInitials = generateInitials(user.displayName ?? undefined, user.email ?? undefined);

	return (
		<div className="w-[655px] px-6">
			<div className="flex flex-col gap-10">
				<div className="flex flex-col gap-6">
					<div className="flex flex-col gap-3 w-[340px]">
						<p className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">
							Profile Image
						</p>
						<div className="relative bg-light-red flex items-center justify-center w-[93px] h-[95px] rounded">
							<span className="font-heading font-medium text-[24px] leading-[30px] text-app-black">
								{userInitials}
							</span>
							<div className="absolute border border-app-gray-300 border-dashed inset-0 pointer-events-none rounded" />
						</div>
						<p className="font-body text-[14px] leading-[18px] text-app-gray-600">
							We support PNG, JPG, JPEG under 10MB
						</p>
					</div>

					<div className="flex flex-col gap-3 w-[340px]">
						<label
							className="font-heading font-semibold text-[16px] leading-[22px] text-app-black"
							htmlFor="user-name"
						>
							Name
						</label>
						<div className="relative">
							<input
								className="w-full h-10 px-3 rounded border border-app-gray-600 bg-white font-body text-[14px] leading-[18px] text-app-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
								id="user-name"
								onChange={(e) => {
									setDisplayName(e.target.value);
								}}
								placeholder="Name Name"
								type="text"
								value={displayName}
							/>
						</div>
					</div>

					<div className="flex flex-col gap-3 w-[340px]">
						<div className="flex items-center gap-1">
							<label
								className="font-heading font-semibold text-[16px] leading-[22px] text-app-black"
								htmlFor="user-email"
							>
								Email address
							</label>
							<div className="w-3 h-3 rounded-full flex items-center justify-center">
								<div className="w-2 h-2 bg-app-gray-600 rounded-full" />
							</div>
						</div>
						<div className="relative">
							<input
								className="w-full h-10 px-3 pr-10 rounded border border-app-gray-600 bg-white font-body text-[14px] leading-[18px] text-app-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
								id="user-email"
								placeholder="Email@address.com"
								readOnly
								type="email"
								value={user.email ?? ""}
							/>
							<div className="absolute right-3 top-1/2 -translate-y-1/2">
								<svg className="w-4 h-4 text-app-gray-600" fill="currentColor" viewBox="0 0 16 16">
									<path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.758 2.855L15 11.114v-5.73zm-.034 6.878L9.271 8.82 8 9.583 6.728 8.82l-5.694 3.44A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.739zM1 11.114l4.758-2.876L1 5.383v5.73z" />
								</svg>
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
								By leaving this account, your personal data associated with this GrantFlow account and
								your user account under [{user.email}] will be permanently deleted. You&apos;ll lose
								access to research projects, data, and team collaboration.
							</p>
						</div>

						<div className="flex justify-end">
							<button
								className="px-2 py-1 bg-white border border-red rounded text-red font-body font-normal text-[14px] leading-[20px] hover:bg-red hover:text-white transition-colors"
								onClick={onDeleteAccount}
								type="button"
							>
								Leave Account
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function PersonalSettingsLayout({ activeTab, children }: PersonalSettingsLayoutProps) {
	return (
		<div className="w-full h-full flex flex-col gap-14">
			<div className="flex flex-col gap-8">
				<div className="flex items-center gap-2">
					<h1 className="font-heading font-medium text-[36px] leading-[42px] text-app-black">Settings</h1>
				</div>

				<div className="flex gap-6 items-center">
					<div
						className={`flex items-center justify-center px-2 py-3 relative ${
							activeTab === "profile" ? "border-b-[3px] border-primary" : ""
						}`}
					>
						<span
							className={`font-heading text-[16px] leading-[22px] ${
								activeTab === "profile" ? "font-semibold text-app-black" : "font-normal text-app-black"
							}`}
						>
							Profile Details
						</span>
					</div>
					<div
						className={`flex items-center justify-center px-2 py-3 relative ${
							activeTab === "notifications" ? "border-b-[3px] border-primary" : ""
						}`}
					>
						<span
							className={`font-body text-[16px] leading-[20px] ${
								activeTab === "notifications"
									? "font-semibold text-app-black"
									: "font-normal text-app-black"
							}`}
						>
							Notifications
						</span>
					</div>
				</div>
			</div>

			<div className="flex-1">{children}</div>
		</div>
	);
}
