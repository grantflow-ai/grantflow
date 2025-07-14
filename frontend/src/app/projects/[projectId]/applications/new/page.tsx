"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createApplication } from "@/actions/grant-applications";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { log } from "@/utils/logger";
import { routes } from "@/utils/navigation";
import { resolveProjectSlug } from "@/utils/slug-resolver";

export default function NewApplicationPage() {
	const router = useRouter();
	const params = useParams();
	const projectSlug = params.projectId as string;
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<null | string>(null);

	useEffect(() => {
		const createNewApplication = async () => {
			if (isCreating) return;

			setIsCreating(true);
			try {
				const projectId = await resolveProjectSlug(projectSlug);
				if (!projectId) {
					setError("Project not found");
					return;
				}

				const application = await createApplication(projectId, {
					title: DEFAULT_APPLICATION_TITLE,
				});

				// Get the project details to create proper navigation
				// Since we don't have project name here, we'll use the slug
				const wizardPath = routes.application.wizard({
					applicationId: application.id,
					applicationTitle: application.title,
					projectId,
					projectName: "Project", // This will be replaced by slug store
				});

				router.replace(wizardPath);
			} catch (error) {
				log.error("new-application-page", error);
				setError("Failed to create application");
				toast.error("Failed to create application");
			}
		};

		void createNewApplication();
	}, [projectSlug, router, isCreating]);

	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-semibold text-gray-900">Error</h1>
					<p className="mt-2 text-gray-600">{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h1 className="text-2xl font-semibold text-gray-900">Creating Application</h1>
				<p className="mt-2 text-gray-600">Please wait while we set up your new application...</p>
			</div>
		</div>
	);
}
