import { BaseModal } from "@/components/app/feedback/base-modal";

import { CreateProjectForm } from "../forms/create-project-form";

interface DashboardCreateProjectModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function DashboardCreateProjectModal({ isOpen, onClose }: DashboardCreateProjectModalProps) {
	return (
		<BaseModal isOpen={isOpen} onClose={onClose} title="New Research Project">
			<CreateProjectForm
				closeModal={(_projectId) => {
					onClose();
				}}
			/>
		</BaseModal>
	);
}
