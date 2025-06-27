"use client";

import { BaseModal } from "@/components/ui/base-modal";

interface DeleteProjectModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

export function DeleteProjectModal({ isOpen, onClose, onConfirm }: DeleteProjectModalProps) {
	const handleDelete = () => {
		onConfirm();
		onClose();
	};

	return (
		<BaseModal isOpen={isOpen} onClose={onClose}>
			<div className="flex flex-col gap-6">
				{/* Title */}
				<h2 className="font-['Source_Sans_Pro'] font-semibold text-[18px] leading-[24px] text-[#2e2d36]">
					Are you sure you want to delete this research project?
				</h2>

				{/* Warning Message */}
				<p className="font-['Source_Sans_Pro'] text-[14px] leading-[20px] text-[#636170]">
					If the project contains applications, they will also be permanently deleted. This action cannot be
					undone.
				</p>

				{/* Buttons */}
				<div className="flex justify-end gap-3">
					<button
						className="px-4 py-2 rounded border border-[#1e13f8] bg-white text-[#1e13f8] font-['Source_Sans_Pro'] font-medium text-[14px] leading-[20px] hover:bg-[#f6f5f9] transition-colors"
						onClick={onClose}
						type="button"
					>
						Cancel
					</button>
					<button
						className="px-4 py-2 rounded bg-[#1e13f8] text-white font-['Source_Sans_Pro'] font-medium text-[14px] leading-[20px] hover:bg-[#1710d4] transition-colors"
						onClick={handleDelete}
						type="button"
					>
						Delete
					</button>
				</div>
			</div>
		</BaseModal>
	);
}