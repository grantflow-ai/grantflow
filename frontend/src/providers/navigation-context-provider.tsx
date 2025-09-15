"use client";

import { useRouter } from "next/navigation";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { getApplication } from "@/actions/grant-applications";
import { getProject } from "@/actions/project";
import { useApplicationStore } from "@/stores/application-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { log } from "@/utils/logger/client";

interface NavigationContextProviderProps {
	children: ReactNode;
	redirectTo?: string;
	requireApplication?: boolean;
	requireProject?: boolean;
}

export function NavigationContextProvider({
	children,
	redirectTo = "/projects",
	requireApplication = false,
	requireProject = false,
}: NavigationContextProviderProps) {
	const router = useRouter();
	const [error, setError] = useState<null | string>(null);

	const activeApplicationId = useNavigationStore((state) => state.activeApplicationId);
	const activeProjectId = useNavigationStore((state) => state.activeProjectId);
	const clearActiveApplication = useNavigationStore((state) => state.clearActiveApplication);
	const clearActiveProject = useNavigationStore((state) => state.clearActiveProject);
	const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId);

	const loadProjectData = useCallback(async () => {
		if (!(activeProjectId && selectedOrganizationId)) return false;
		try {
			const project = await getProject(selectedOrganizationId, activeProjectId);
			useProjectStore.getState().setProject(project);
			return true;
		} catch (error) {
			log.error("Failed to load project data", { activeProjectId, error, selectedOrganizationId });
			clearActiveProject();
			return false;
		}
	}, [activeProjectId, selectedOrganizationId, clearActiveProject]);

	const loadApplicationData = useCallback(async () => {
		if (!(activeApplicationId && activeProjectId && selectedOrganizationId)) return false;
		try {
			const application = await getApplication(selectedOrganizationId, activeProjectId, activeApplicationId);
			useApplicationStore.getState().setApplication(application);
			return true;
		} catch (error) {
			log.error("Failed to load application data", {
				activeApplicationId,
				activeProjectId,
				error,
				selectedOrganizationId,
			});
			clearActiveApplication();
			return false;
		}
	}, [activeApplicationId, activeProjectId, selectedOrganizationId, clearActiveApplication]);

	const loadRequiredData = useCallback(async () => {
		if (activeProjectId && requireProject) {
			const projectLoaded = await loadProjectData();
			if (!projectLoaded) {
				setError("Project not found");
				return;
			}
		}

		if (activeApplicationId && requireApplication) {
			const applicationLoaded = await loadApplicationData();
			if (!applicationLoaded) {
				setError("Application not found");
				return;
			}
		}
	}, [
		activeProjectId,
		activeApplicationId,
		requireProject,
		requireApplication,
		loadProjectData,
		loadApplicationData,
	]);

	useEffect(() => {
		if (
			!selectedOrganizationId ||
			(requireProject && !activeProjectId) ||
			(requireApplication && !activeApplicationId)
		) {
			router.replace(redirectTo);
			return;
		}

		void loadRequiredData();
	}, [
		selectedOrganizationId,
		requireProject,
		requireApplication,
		activeProjectId,
		activeApplicationId,
		redirectTo,
		router,
		loadRequiredData,
	]);

	useEffect(() => {
		if (!error) return;

		const timeoutId = setTimeout(() => {
			router.replace(redirectTo);
		}, 2000);

		return () => {
			clearTimeout(timeoutId);
		};
	}, [error, router, redirectTo]);

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
				<p className="text-red-600 font-medium">{error}</p>
				<p className="text-gray-500 text-sm">Redirecting in 2 seconds...</p>
			</div>
		);
	}

	return <>{children}</>;
}
