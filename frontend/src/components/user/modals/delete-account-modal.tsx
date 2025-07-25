"use client";

import { X } from "lucide-react";

interface DeleteAccountModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

export function DeleteAccountModal({ isOpen, onClose, onConfirm }: DeleteAccountModalProps) {
	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-popup-cover">
			<div className="relative w-[464px] bg-white rounded-lg p-8 border border-primary">
				{}
				<button
					className="absolute right-4 top-4 p-0 hover:opacity-70 transition-opacity"
					onClick={onClose}
					type="button"
				>
					<X className="size-4 text-app-gray-700" />
				</button>

				{}
				<div className="flex flex-col gap-8">
					{}
					<div className="flex flex-col gap-3">
						<h2 className="font-heading font-medium text-[24px] leading-[30px] text-app-black">
							Are You Sure You Want to Leave This Account?
						</h2>
						<p className="font-body text-[16px] leading-[20px] text-app-black">
							By leaving this account, your personal data associated with this GrantFlow account and your
							user profile will be deleted.
							<br />
							You will lose access to all research projects, data, and team collaboration.
						</p>
					</div>

					{}
					<div className="flex items-end justify-between">
						<button
							className="px-4 py-2 bg-white border border-primary rounded font-button text-[16px] leading-[22px] text-primary hover:bg-primary hover:text-white transition-colors"
							onClick={onClose}
							type="button"
						>
							Cancel
						</button>
						<button
							className="px-4 py-2 bg-primary rounded font-button text-[16px] leading-[22px] text-white hover:bg-opacity-90 transition-colors"
							onClick={onConfirm}
							type="button"
						>
							Leave and log out
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
