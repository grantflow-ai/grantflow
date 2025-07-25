"use client";

import { signOut } from "firebase/auth";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useOrganizationStore } from "@/stores/organization-store";
import { useUserStore } from "@/stores/user-store";
import { getFirebaseAuth } from "@/utils/firebase";
import { log } from "@/utils/logger";
import { routes } from "@/utils/navigation";

interface DeleteOrganizationModalProps {
	isOpen: boolean;
	onClose: () => void;
	organizationId: string;
	organizationName: string;
}

export function DeleteOrganizationModal({
	isOpen,
	onClose,
	organizationId,
	organizationName,
}: DeleteOrganizationModalProps) {
	const router = useRouter();
	const [confirmationText, setConfirmationText] = useState("");
	const [isDeleting, setIsDeleting] = useState(false);
	const { clearOrganization } = useOrganizationStore();
	const { clearUser } = useUserStore();

	const handleDelete = async () => {
		if (confirmationText !== organizationName) {
			toast.error("Organization name does not match");
			return;
		}

		setIsDeleting(true);
		try {
			// TODO: Implement organization deletion API call

			log.info("Deleting organization", { organizationId });

			clearOrganization();

			toast.success("Organization deleted successfully");

			const auth = getFirebaseAuth();
			await signOut(auth);
			clearUser();
			router.push(routes.home());
		} catch (error) {
			log.error("Error deleting organization", error);
			toast.error("Failed to delete organization");
			setIsDeleting(false);
		}
	};

	const handleClose = () => {
		if (!isDeleting) {
			setConfirmationText("");
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		<button
			aria-label="Close modal"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 border-none cursor-default"
			data-testid="delete-organization-modal-overlay"
			onClick={handleClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") handleClose();
			}}
			type="button"
		>
			{/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
			<div
				aria-labelledby="delete-organization-modal-title"
				aria-modal="true"
				className="relative bg-white rounded-lg w-[464px] border border-primary"
				data-testid="delete-organization-modal"
				onClick={(e) => {
					e.stopPropagation();
				}}
				onKeyDown={(e) => {
					e.stopPropagation();
				}}
				role="dialog"
			>
				<div className="flex flex-col gap-8 p-8">
					<div className="flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<h2
								className="font-heading font-medium text-[24px] leading-[30px] text-app-black"
								id="delete-organization-modal-title"
							>
								Confirm Deletion of Organization
							</h2>
							<button
								className="absolute top-4 right-4 p-0 text-app-gray-700 hover:text-app-black transition-colors"
								data-testid="delete-organization-modal-close"
								disabled={isDeleting}
								onClick={handleClose}
								type="button"
							>
								<X className="size-4" />
							</button>
						</div>
						<p className="text-[16px] text-app-black font-body">
							You are about to delete the organization{" "}
							<span className="font-semibold">{organizationName}</span>. This action will remove all
							associated data.
						</p>
					</div>

					<div className="flex flex-col gap-6">
						<div className="flex flex-col gap-3">
							<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">
								To confirm, please type the name of the organization below:
							</h3>
						</div>

						<input
							className="w-full h-10 px-3 border border-app-gray-300 rounded bg-white text-[14px] font-body text-app-gray-600 placeholder:text-app-gray-400 focus:outline-none focus:border-primary"
							data-testid="delete-organization-confirmation-input"
							disabled={isDeleting}
							onChange={(e) => {
								setConfirmationText(e.target.value);
							}}
							placeholder="Organisation name"
							type="text"
							value={confirmationText}
						/>
					</div>

					<div className="flex items-end justify-between">
						<button
							className="px-4 py-2 border border-primary rounded bg-white text-primary font-button text-[16px] hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							data-testid="delete-organization-cancel-button"
							disabled={isDeleting}
							onClick={handleClose}
							type="button"
						>
							Cancel
						</button>

						<button
							className="px-4 py-2 bg-primary text-white rounded font-button text-[16px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							data-testid="delete-organization-confirm-button"
							disabled={isDeleting || confirmationText !== organizationName}
							onClick={handleDelete}
							type="button"
						>
							{isDeleting ? "Deleting..." : "Delete and log out"}
						</button>
					</div>
				</div>
			</div>
		</button>
	);
}
