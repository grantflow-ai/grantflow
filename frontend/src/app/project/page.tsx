"use server";

import { ProjectDetailClient } from "@/components/projects/detail/project-detail-client";
import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";

export default function ProjectDetailPage() {
	// This page requires an active project context
	// The NavigationContextProvider will handle fetching the project
	// based on the stored activeProjectId

	return (
		<NavigationContextProvider redirectTo={routes.projects()} requireProject>
			<ProjectDetailClient />
		</NavigationContextProvider>
	);
}
