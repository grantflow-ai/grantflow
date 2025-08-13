"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createApplication } from "@/actions/grant-applications";
import { AppButton } from "@/components/app";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { useNavigationStore } from "@/stores/navigation-store";
import { useProjectStore } from "@/stores/project-store";
import { log } from "@/utils/logger/client";
import { routes } from "@/utils/navigation";

interface CreateApplicationButtonProps {
	className?: string;
	organizationId: string;
	projectId: string;
}

export function CreateApplicationButton({ className, organizationId, projectId }: CreateApplicationButtonProps) {
	const router = useRouter();
	const { project } = useProjectStore();
	const { navigateToApplication } = useNavigationStore();
	const [isCreating, setIsCreating] = useState(false);

	const handleCreateApplication = async () => {
		setIsCreating(true);
		try {
			const application = await createApplication(organizationId, projectId, {
				title: DEFAULT_APPLICATION_TITLE,
			});

			if (project) {
				navigateToApplication(
					project.id,
					project.name,
					application.id,
					application.title || DEFAULT_APPLICATION_TITLE,
				);
			}
			const wizardPath = routes.organization.project.application.wizard();
			router.push(wizardPath);
		} catch (error) {
			log.error("create-application-button", error);
			toast.error("Failed to create application");
			setIsCreating(false);
		}
	};

	return (
		<AppButton
			className={className}
			data-testid="create-application-button"
			disabled={isCreating}
			onClick={handleCreateApplication}
			size="sm"
		>
			{isCreating ? "Creating..." : "New Application"}
		</AppButton>
	);
}
