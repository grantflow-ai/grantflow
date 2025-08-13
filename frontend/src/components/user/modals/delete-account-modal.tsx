"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app";
import { BaseModal } from "@/components/app/feedback/base-modal";

interface DeleteAccountModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => Promise<void> | void;
}

export function DeleteAccountModal({ isOpen, onClose, onConfirm }: DeleteAccountModalProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleConfirm = async () => {
		setIsDeleting(true);
		const toastId = toast.loading("Deleting account...");
		try {
			await onConfirm();
			toast.success("Account deleted successfully.", { id: toastId });
		} catch {
			toast.error("Failed to delete account.", { id: toastId });
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<BaseModal className=" w-[464px]" isOpen={isOpen} onClose={onClose}>
			<div className="flex flex-col gap-6 " data-testid="delete-account-modal">
				<h2 className="font-body font-medium text-[24px] leading-[30px] text-app-black">
					Are You Sure You Want to Leave This Account?
				</h2>

				<p className="text-base leading-5 text-app-black font-normal">
					By leaving this account, your personal data associated with this GrantFlow account and your user{" "}
					<span className="whitespace-nowrap">profile will be deleted.</span> You will lose access to all
					research projects, data, and team collaboration.
				</p>

				<div className="flex justify-between items-center">
					<AppButton
						className="rounded-sm px-4 py-2"
						data-testid="cancel-button"
						disabled={isDeleting}
						onClick={onClose}
						type="button"
						variant="secondary"
					>
						Cancel
					</AppButton>
					<AppButton
						className="rounded-sm px-4 py-2"
						data-testid="delete-button"
						disabled={isDeleting}
						onClick={handleConfirm}
						type="button"
						variant="primary"
					>
						{isDeleting ? "Deleting..." : "Leave and log out"}
					</AppButton>
				</div>
			</div>
		</BaseModal>
	);
}
