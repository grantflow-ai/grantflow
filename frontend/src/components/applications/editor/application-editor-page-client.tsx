"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getApplication } from "@/actions/grant-applications";
import { EditorContainer } from "@/components/organizations/project/applications/editor/editor-container";
import { useNavigationStore } from "@/stores/navigation-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { routes } from "@/utils/navigation";

export function ApplicationEditorPageClient() {
	const router = useRouter();
	const { project } = useProjectStore();
	const { selectedOrganizationId } = useOrganizationStore();
	const { activeApplicationId } = useNavigationStore();
	const [application, setApplication] = useState<Awaited<ReturnType<typeof getApplication>> | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<null | string>(null);

	useEffect(() => {
		async function loadApplication() {
			if (!(project && activeApplicationId && selectedOrganizationId)) {
				router.replace(routes.organization.root());
				return;
			}

			try {
				setIsLoading(true);
				const app = await getApplication(selectedOrganizationId, project.id, activeApplicationId);
				setApplication(app);
			} catch {
				setError("Failed to load application");
				setTimeout(() => {
					router.replace(routes.organization.project.detail());
				}, 2000);
			} finally {
				setIsLoading(false);
			}
		}

		void loadApplication();
	}, [project, activeApplicationId, router, selectedOrganizationId]);

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
				<div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary" />
				<p className="text-gray-600 font-medium">Loading editor...</p>
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

	return <EditorContainer documentId="" />;
}
