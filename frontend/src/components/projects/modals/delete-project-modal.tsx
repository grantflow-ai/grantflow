"use client";

import { BaseModal } from "@/components/app/feedback/base-modal";

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
				<h2 className="font-body font-semibold text-[18px] leading-[24px] text-text-primary">
					Are you sure you want to delete this research project?
				</h2>

				{/* Warning Message */}
				<p className="font-body text-[14px] leading-[20px] text-text-secondary">
					If the project contains applications, they will also be permanently deleted. This action cannot be
					undone.
				</p>

				{/* Buttons */}
				<div className="flex justify-end gap-3">
					<button
						className="px-4 py-2 rounded-md border border-action-primary bg-surface-primary text-action-primary font-button font-medium text-[14px] leading-[20px] hover:bg-surface-secondary transition-colors"
						onClick={onClose}
						type="button"
					>
						Cancel
					</button>
					<button
						className="px-4 py-2 rounded-md bg-action-primary text-white font-button font-medium text-[14px] leading-[20px] hover:bg-action-primary/90 transition-colors"
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