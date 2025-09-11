"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createApplication } from "@/actions/grant-applications";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { useNavigationStore } from "@/stores/navigation-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { routes } from "@/utils/navigation";

export function NewApplicationClient() {
	const router = useRouter();
	const { project } = useProjectStore();
	const { selectedOrganizationId } = useOrganizationStore();
	const { navigateToApplication } = useNavigationStore();
	const creatingRef = useRef(false);

	useEffect(() => {
		async function createNewApplication() {
			if (creatingRef.current || !project || !selectedOrganizationId) return;
			creatingRef.current = true;

			try {
				const application = await createApplication(selectedOrganizationId, project.id, {
					title: DEFAULT_APPLICATION_TITLE,
				});

				navigateToApplication(
					project.id,
					project.name,
					application.id,
					application.title || DEFAULT_APPLICATION_TITLE,
				);

				router.replace(routes.organization.project.application.wizard());
			} catch {
				toast.error("Failed to create application. Please try again.");
				router.replace(routes.organization.project.detail());
			}
		}

		void createNewApplication();
	}, [project, router, navigateToApplication, selectedOrganizationId]);

	if (!project) {
		return null;
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-50">
			<div className="text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
				<h2 className="text-2xl font-semibold text-gray-900 mb-2">Creating Application</h2>
				<p className="text-gray-600">Please wait while we set up your new application...</p>
			</div>
		</div>
	);
}
