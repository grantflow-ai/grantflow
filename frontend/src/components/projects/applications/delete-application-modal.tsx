import { X } from "lucide-react";
import { AppButton } from "@/components/app";
import { BaseModal } from "@/components/app/feedback/base-modal";

interface DeleteApplicationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

export function DeleteApplicationModal({ isOpen, onClose, onConfirm }: DeleteApplicationModalProps) {
	return (
		<BaseModal isOpen={isOpen} onClose={onClose}>
			<div className="flex flex-col gap-8 p-8 w-[464px] " data-testid="delete-application-modal">
				{}
				<button
					aria-label="Close modal"
					className="absolute right-4 top-4 flex size-4 items-center justify-center text-black hover:text-[#2e2d36]"
					data-testid="close-modal-button"
					onClick={onClose}
					type="button"
				>
					<X className="size-4" />
				</button>

				<div className="flex flex-col gap-4">
					<h2 className=" font-medium text-2xl leading-[30px] text-black">
						Are you sure you want to delete this application?
					</h2>
					<p className="text-base font-normal leading-[20px] text-black">
						This action is permanent and cannot be undone.
					</p>
				</div>
				<div className="flex items-center justify-between">
					<AppButton
						className="px-4 py-2 rounded "
						data-testid="cancel-button"
						onClick={onClose}
						type="button"
						variant="secondary"
					>
						Cancel
					</AppButton>
					<AppButton
						className="px-4 py-2 rounded "
						data-testid="delete-button"
						onClick={() => {
							onConfirm();
							onClose();
						}}
						type="button"
						variant="primary"
					>
						Delete
					</AppButton>
				</div>
			</div>
		</BaseModal>
	);
}
