"use client";

import { EditorContainer } from "@/components/projects/applications/editor/editor-container";

export function ApplicationEditorPageClient() {
	// useEffect(() => {
	// 	async function loadApplication() {
	// 		if (!(project && activeApplicationId && selectedOrganizationId)) {
	// 			router.replace(routes.organization.root());
	// 			return;
	// 		}

	// 		try {
	// 			setIsLoading(true);
	// 			const app = await getApplication(selectedOrganizationId, project.id, activeApplicationId);
	// 			setApplication(app);
	// 		} catch {
	// 			setError("Failed to load application");
	// 			setTimeout(() => {
	// 				router.replace(routes.organization.project.detail());
	// 			}, 2000);
	// 		} finally {
	// 			setIsLoading(false);
	// 		}
	// 	}

	// 	void loadApplication();
	// }, [project, activeApplicationId, router, selectedOrganizationId]);

	// if (isLoading) {
	// 	return (
	// 		<div className="flex items-center justify-center min-h-screen bg-gray-50">
	// 			<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
	// 		</div>
	// 	);
	// }

	// if (error) {
	// 	return (
	// 		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
	// 			<p className="text-red-600 mb-4">{error}</p>
	// 			<p className="text-gray-600">Redirecting...</p>
	// 		</div>
	// 	);
	// }

	// if (!(application && project)) {
	// 	return null; // Will redirect
	// }

	return <EditorContainer />;
}
