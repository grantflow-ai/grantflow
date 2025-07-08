import { AppButton } from "@/components/app";
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
		<BaseModal className=" w-[464px]" isOpen={isOpen} onClose={onClose}>
			<div className="flex flex-col gap-6 " data-testid="delete-project-modal">
				{}
				<h2 className="font-body font-medium text-[28px] leading-[34px] text-black">
					Are you sure you want to delete this research project?
				</h2>

				{}
				<p className="font-body text-base leading-5 text-black font-normal">
					If the project contains applications, they will also be permanently deleted. This action cannot be
					undone.
				</p>

				{}
				<div className="flex justify-between items-center">
					<AppButton
						className="rounded-sm px-4 py-2"
						data-testid="cancel-button"
						onClick={onClose}
						variant="secondary"
					>
						Cancel
					</AppButton>
					<AppButton
						className="rounded-sm px-4 py-2"
						data-testid="delete-button"
						onClick={handleDelete}
						variant="primary"
					>
						Delete
					</AppButton>
				</div>
			</div>
		</BaseModal>
	);
}
