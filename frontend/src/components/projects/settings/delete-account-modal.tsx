import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { deleteAccount, getSoleOwnedProjects } from "@/actions/user";
import { AppButton } from "@/components/app";
import { BaseModal } from "@/components/app/feedback/base-modal";
import { useUserStore } from "@/stores/user-store";
import { log } from "@/utils/logger";

interface DeleteAccountModalProps {
	isOpen: boolean;
	onClose: () => void;
}

interface SoleOwnedProject {
	id: string;
	name: string;
}

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
	const [isDeleting, setIsDeleting] = useState(false);
	const [isChecking, setIsChecking] = useState(false);
	const [soleOwnedProjects, setSoleOwnedProjects] = useState<SoleOwnedProject[]>([]);
	const [error, setError] = useState<null | string>(null);
	const router = useRouter();
	const clearUser = useUserStore((state) => state.clearUser);

	const checkSoleOwnedProjects = useCallback(async () => {
		try {
			setIsChecking(true);
			setError(null);
			const result = await getSoleOwnedProjects();
			setSoleOwnedProjects(result.projects);
		} catch (error) {
			log.error("DeleteAccountModal.checkSoleOwnedProjects", error);
			setError("Failed to check project ownership. Please try again.");
		} finally {
			setIsChecking(false);
		}
	}, []);

	useEffect(() => {
		if (isOpen) {
			void checkSoleOwnedProjects();
		}
	}, [isOpen, checkSoleOwnedProjects]);

	const handleDelete = async () => {
		try {
			setIsDeleting(true);
			setError(null);

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

			// Check if this is the ownership transfer error
			if (
				error &&
				typeof error === "object" &&
				"extra" in error &&
				typeof error.extra === "object" &&
				error.extra !== null &&
				"error" in error.extra &&
				error.extra.error === "ownership_transfer_required"
			) {
				// Refresh the sole-owned projects list
				await checkSoleOwnedProjects();
			} else {
				setError("Failed to delete account. Please try again.");
			}
		} finally {
			setIsDeleting(false);
		}
	};

	const hasSoleOwnedProjects = soleOwnedProjects.length > 0;

	return (
		<BaseModal isOpen={isOpen} onClose={onClose} title="Delete Account">
			<div className="flex flex-col gap-8" data-testid="delete-account-modal">
				{isChecking && (
					<div className="flex items-center justify-center py-8">
						<p className="text-gray-600">Checking project ownership...</p>
					</div>
				)}
				{!isChecking && hasSoleOwnedProjects && (
					<>
						<div className="flex flex-col gap-4">
							<div className="flex items-start gap-3">
								<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100">
									<span className="text-xl">⚠️</span>
								</div>
								<div className="flex flex-col gap-2">
									<h2 className="font-cabin text-xl font-medium text-[#2e2d36]">
										Action Required: Transfer Project Ownership
									</h2>
									<p className="font-source-sans-pro text-base text-[#2e2d36]">
										You are the sole owner of the following projects. Before deleting your account,
										you must either transfer ownership to another member or delete these projects:
									</p>
								</div>
							</div>

							<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
								<ul className="space-y-2">
									{soleOwnedProjects.map((project) => (
										<li className="flex items-center justify-between" key={project.id}>
											<span className="font-medium text-gray-900">{project.name}</span>
											<Link
												className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
												href={`/projects/${project.id}/settings`}
												onClick={onClose}
											>
												Manage →
											</Link>
										</li>
									))}
								</ul>
							</div>
						</div>

						<div className="flex flex-row items-end justify-between">
							<AppButton
								className="w-[90px]"
								data-testid="cancel-button"
								onClick={onClose}
								variant="secondary"
							>
								Close
							</AppButton>
						</div>
					</>
				)}
				{!(isChecking || hasSoleOwnedProjects) && (
					<>
						<div className="flex flex-col gap-3">
							<h2 className="font-cabin text-2xl font-medium leading-[30px] text-[#2e2d36]">
								Are you sure you want to delete your account?
							</h2>
							<p className="font-source-sans-pro text-base leading-5 text-[#2e2d36]">
								This will schedule your account for deletion. You will be removed from all projects
								immediately, but your account can be restored within 30 days by contacting support.
								After 30 days, deletion will be permanent and cannot be undone.
							</p>
							{error && <p className="text-sm text-red-600">{error}</p>}
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
					</>
				)}
			</div>
		</BaseModal>
	);
}
