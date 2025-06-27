"use client";

import { BaseModal } from "@/components/ui/base-modal";

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
					// Project will be added to the list via SWR invalidation
				}}
			/>
		</BaseModal>
	);
}
