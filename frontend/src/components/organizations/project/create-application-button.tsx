"use client";

import { useRouter } from "next/navigation";
import { AppButton } from "@/components/app/buttons/app-button";
import { useNavigationStore } from "@/stores/navigation-store";
import { useProjectStore } from "@/stores/project-store";
import { routes } from "@/utils/navigation";

interface CreateApplicationButtonProps {
	className?: string;
}

export function CreateApplicationButton({ className }: CreateApplicationButtonProps) {
	const router = useRouter();
	const project = useProjectStore((state) => state.project);
	const navigateToProject = useNavigationStore((state) => state.navigateToProject);

	const handleCreateApplication = () => {
		if (project) {
			navigateToProject(project.id, project.name);
		}

		router.push(routes.organization.project.application.new());
	};

	return (
		<AppButton
			className={className}
			data-testid="create-application-button"
			onClick={handleCreateApplication}
			size="sm"
		>
			New Application
		</AppButton>
	);
}
