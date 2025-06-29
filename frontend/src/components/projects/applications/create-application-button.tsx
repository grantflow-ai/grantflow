"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createApplication } from "@/actions/grant-applications";
import { AppButton } from "@/components/app";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { PagePath } from "@/enums";
import { log } from "@/utils/logger";

interface CreateApplicationButtonProps {
	className?: string;
	projectId: string;
}

export function CreateApplicationButton({ className, projectId }: CreateApplicationButtonProps) {
	const router = useRouter();
	const [isCreating, setIsCreating] = useState(false);

	const handleCreateApplication = async () => {
		setIsCreating(true);
		try {
			const application = await createApplication(projectId, { title: DEFAULT_APPLICATION_TITLE });
			const wizardPath = PagePath.APPLICATION_WIZARD.replace(":projectId", projectId).replace(
				":applicationId",
				application.id,
			);
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
