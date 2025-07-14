"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getApplication } from "@/actions/grant-applications";
import { WizardClientComponent } from "@/components/projects/wizard";
import { useNavigationStore } from "@/stores/navigation-store";
import { useProjectStore } from "@/stores/project-store";
import { routes } from "@/utils/navigation";

export function ApplicationWizardPageClient() {
	const router = useRouter();
	const { project } = useProjectStore();
	const { activeApplicationId } = useNavigationStore();
	const [application, setApplication] = useState<Awaited<ReturnType<typeof getApplication>> | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<null | string>(null);

	useEffect(() => {
		async function loadApplication() {
			if (!(project && activeApplicationId)) {
				router.replace(routes.projects());
				return;
			}

			try {
				setIsLoading(true);
				const app = await getApplication(project.id, activeApplicationId);
				setApplication(app);
			} catch {
				setError("Application not found");
				// Redirect after a short delay to show the error
				setTimeout(() => {
					router.replace(routes.project.detail());
				}, 2000);
			} finally {
				setIsLoading(false);
			}
		}

		void loadApplication();
	}, [project, activeApplicationId, router]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
				<p className="text-red-600 mb-4">{error}</p>
				<p className="text-gray-600">Redirecting...</p>
			</div>
		);
	}

	if (!(application && project)) {
		return null; // Will redirect
	}

	return <WizardClientComponent application={application} projectId={project.id} />;
}
