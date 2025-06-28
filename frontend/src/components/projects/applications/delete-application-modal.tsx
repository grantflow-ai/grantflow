"use client";

import { X } from "lucide-react";

import { BaseModal } from "@/components/app/feedback/base-modal";

interface DeleteApplicationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

export function DeleteApplicationModal({ isOpen, onClose, onConfirm }: DeleteApplicationModalProps) {
	return (
		<BaseModal isOpen={isOpen} onClose={onClose}>
			<div className="flex flex-col gap-6 p-8 w-[464px]">
				{/* Close button */}
				<button
					className="absolute right-4 top-4 flex size-4 items-center justify-center text-[#636170] hover:text-[#2e2d36]"
					onClick={onClose}
					type="button"
				>
					<X className="size-4" />
				</button>

				{/* Content */}
				<div className="flex flex-col gap-4">
					<h2 className="font-['Cabin'] font-medium text-[24px] leading-[30px] text-[#2e2d36]">
						Are you sure you want to delete this application?
					</h2>
					<p className="font-['Source_Sans_Pro'] text-[16px] leading-[20px] text-[#636170]">
						This action is permanent and cannot be undone.
					</p>
				</div>

				{/* Buttons */}
				<div className="flex items-center justify-end gap-3">
					<button
						className="px-4 py-2 border border-[#1e13f8] rounded bg-white font-['Sora'] text-[16px] leading-[22px] text-[#1e13f8] hover:bg-[#f6f5f9] transition-colors"
						onClick={onClose}
						type="button"
					>
						Cancel
					</button>
					<button
						className="px-4 py-2 bg-[#1e13f8] rounded font-['Sora'] text-[16px] leading-[22px] text-white hover:bg-[#1710d4] transition-colors"
						onClick={() => {
							onConfirm();
							onClose();
						}}
						type="button"
					>
						Delete
					</button>
				</div>
			</div>
		</BaseModal>
	);
}