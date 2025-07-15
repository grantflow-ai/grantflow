"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useNavigationStore } from "@/stores/navigation-store";
import { routes } from "@/utils/navigation";

interface UseNavigationContextOptions {
	redirectTo?: string;
	requireApplication?: boolean;
	requireProject?: boolean;
}

export function useNavigationContext(options: UseNavigationContextOptions = {}) {
	const router = useRouter();
	const { activeApplicationId, activeApplicationTitle, activeProjectId, activeProjectName } = useNavigationStore();

	const { redirectTo = routes.projects(), requireApplication = false, requireProject = false } = options;

	useEffect(() => {
		// Check if required context is missing
		if (requireProject && !activeProjectId) {
			router.replace(redirectTo);
		}

		if (requireApplication && !activeApplicationId) {
			router.replace(redirectTo);
		}
	}, [activeProjectId, activeApplicationId, requireProject, requireApplication, redirectTo, router]);

	return {
		applicationId: activeApplicationId,
		applicationTitle: activeApplicationTitle,
		hasApplication: !!activeApplicationId,
		hasProject: !!activeProjectId,
		projectId: activeProjectId,
		projectName: activeProjectName,
	};
}
