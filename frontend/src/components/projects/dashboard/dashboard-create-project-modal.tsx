import { useRouter } from "next/navigation";

import { BaseModal } from "@/components/app/feedback/base-modal";
import { PagePath } from "@/enums";

import { CreateProjectForm } from "../forms/create-project-form";

interface DashboardCreateProjectModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function DashboardCreateProjectModal({ isOpen, onClose }: DashboardCreateProjectModalProps) {
	const router = useRouter();

	return (
		<BaseModal isOpen={isOpen} onClose={onClose} title="New Research Project">
			<CreateProjectForm
				closeModal={(projectId) => {
					onClose();
					if (projectId) {
						router.push(PagePath.PROJECT_DETAIL.replace(":projectId", projectId));
					}
				}}
			/>
		</BaseModal>
	);
}
