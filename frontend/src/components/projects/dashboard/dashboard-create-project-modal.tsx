"use client";

import { useRouter } from "next/navigation";

import { BaseModal } from "@/components/app/feedback/base-modal";
import { PagePath } from "@/enums";
import { log } from "@/utils/logger";

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
					log.info("[DashboardCreateProjectModal] closeModal called", { projectId });
					onClose();
					if (projectId) {
						const path = PagePath.PROJECT_DETAIL.replace(":projectId", projectId);
						log.info("[DashboardCreateProjectModal] Navigating to project", { path, projectId });
						router.push(path);
					}
				}}
			/>
		</BaseModal>
	);
}
