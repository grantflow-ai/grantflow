"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccount } from "@/actions/user";
import { AppButton } from "@/components/app";
import { BaseModal } from "@/components/app/feedback/base-modal";
import { useUserStore } from "@/stores/user-store";
import { log } from "@/utils/logger";

interface DeleteAccountModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
	const [isDeleting, setIsDeleting] = useState(false);
	const router = useRouter();
	const clearUser = useUserStore((state) => state.clearUser);

	const handleDelete = async () => {
		try {
			setIsDeleting(true);

			const result = await deleteAccount();

			clearUser();

			// Pass deletion details in the URL for the login page to display
			const params = new URLSearchParams({
				gracePeriod: result.grace_period_days.toString(),
				message: "account-deleted",
				scheduledDate: result.scheduled_deletion_date,
			});

			router.push(`/login?${params.toString()}`);
		} catch (error) {
			log.error("DeleteAccountModal.handleDelete", error);
			// NOTE: Show error toast in future enhancement
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<BaseModal isOpen={isOpen} onClose={onClose} title="Delete Account">
			<div className="flex flex-col gap-8" data-testid="delete-account-modal">
				<div className="flex flex-col gap-3">
					<h2 className="font-cabin text-2xl font-medium leading-[30px] text-[#2e2d36]">
						Are you sure you want to delete your account?
					</h2>
					<p className="font-source-sans-pro text-base leading-5 text-[#2e2d36]">
						This will schedule your account for deletion. You will be removed from all projects immediately,
						but your account can be restored within 30 days by contacting support. After 30 days, deletion
						will be permanent and cannot be undone.
					</p>
				</div>

				<div className="flex flex-row items-end justify-between">
					<AppButton
						className="w-[90px]"
						data-testid="cancel-button"
						disabled={isDeleting}
						onClick={onClose}
						variant="secondary"
					>
						Cancel
					</AppButton>
					<AppButton
						className="bg-[#1e13f8] hover:bg-[#1e13f8]/90"
						data-testid="delete-button"
						disabled={isDeleting}
						onClick={handleDelete}
						variant="primary"
					>
						{isDeleting ? "Deleting..." : "Delete and log out"}
					</AppButton>
				</div>
			</div>
		</BaseModal>
	);
}
