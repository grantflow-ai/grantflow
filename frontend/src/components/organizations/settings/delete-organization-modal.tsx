"use client";

import { signOut } from "firebase/auth";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useOrganizationStore, useUserStore } from "@/stores";
import { getFirebaseAuth } from "@/utils/firebase";
import { log } from "@/utils/logger/client";
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
								className="font-cabin font-medium text-[24px] leading-[30px] text-app-black"
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
						<p className="text-base leading-5 text-app-black font-body text-left">
							You are about to delete the organization
							<span className="font-semibold px-1">{organizationName}</span>. This action will remove all
							associated data.
						</p>
					</div>

					<div className="flex flex-col gap-6">
						<h3 className="font-cabin font-semibold text-base leading-[22px] text-left text-app-black">
							To confirm, please type the name of the <br /> organization below:
						</h3>

						<input
							className="w-full h-10 px-3 border border-app-gray-300 rounded bg-white text-sm font-cabin text-app-gray-600 placeholder:text-app-gray-400 placeholder:text-base placeholder:font-normal focus:outline-none focus:border-primary"
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
							className="cursor-pointer px-4 py-2 border border-primary rounded bg-white text-primary font-button text-[18px] font-normal hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							data-testid="delete-organization-cancel-button"
							disabled={isDeleting}
							onClick={handleClose}
							type="button"
						>
							Cancel
						</button>

						<button
							className="cursor-pointer px-4 py-2 bg-primary font-normal text-white rounded  text-[18px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
