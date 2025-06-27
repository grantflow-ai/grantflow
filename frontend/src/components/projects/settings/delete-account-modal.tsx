"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccount } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useUserStore } from "@/stores/user-store";
import { logError } from "@/utils/logging";

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

			// Call the delete account API
			await deleteAccount();

			// Clear user from store
			clearUser();

			// Redirect to login page with message
			router.push("/login?message=account-deleted");
		} catch (error) {
			logError({ error, identifier: "DeleteAccountModal.handleDelete" });
			// NOTE: Show error toast in future enhancement
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose}>
			<div className="relative w-full max-w-[464px] rounded-lg bg-white p-8">
				<button
					className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
					onClick={onClose}
					type="button"
				>
					<X className="size-4" />
					<span className="sr-only">Close</span>
				</button>

				<div className="flex flex-col gap-8">
					<div className="flex flex-col gap-3">
						<h2 className="font-cabin text-2xl font-medium leading-[30px] text-[#2e2d36]">
							Are you sure you want to delete your account?
						</h2>
						<p className="font-source-sans-pro text-base leading-5 text-[#2e2d36]">
							This will permanently delete your account, including all associated research projects,
							applications, and data. This action cannot be undone.
						</p>
					</div>

					<div className="flex flex-row items-end justify-between">
						<Button className="w-[90px]" disabled={isDeleting} onClick={onClose} variant="outline">
							Cancel
						</Button>
						<Button
							className="bg-[#1e13f8] hover:bg-[#1e13f8]/90"
							disabled={isDeleting}
							onClick={handleDelete}
							variant="default"
						>
							{isDeleting ? "Deleting..." : "Delete and log out"}
						</Button>
					</div>
				</div>
			</div>
		</Modal>
	);
}
