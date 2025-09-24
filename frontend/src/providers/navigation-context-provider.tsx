"use client";

import { useRouter } from "next/navigation";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { getApplication } from "@/actions/grant-applications";
import { getOrganizations } from "@/actions/organization";
import { getProject } from "@/actions/project";
import { useOrganizationValidation } from "@/hooks/use-organization-validation";
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
	const navigationStateHydrated = useNavigationStore((state) => state.stateHydrated);
	const activeProjectId = useNavigationStore((state) => state.activeProjectId);
	const clearActiveApplication = useNavigationStore((state) => state.clearActiveApplication);
	const clearActiveProject = useNavigationStore((state) => state.clearActiveProject);
	const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId);
	const organizations = useOrganizationStore((state) => state.organizations);
	const [organizationsLoading, setOrganizationsLoading] = useState(!(selectedOrganizationId ?? organizations.length));

	const validatedOrganizationId = useOrganizationValidation(organizations, organizationsLoading, true);

	const loadProjectData = useCallback(async () => {
		if (!navigationStateHydrated) return false;
		if (!(activeProjectId && validatedOrganizationId)) return false;
		try {
			const project = await getProject(validatedOrganizationId, activeProjectId);
			useProjectStore.getState().setProject(project);
			return true;
		} catch (error) {
			log.error("Failed to load project data", {
				activeProjectId,
				error,
				validatedOrganizationId,
			});
			clearActiveProject();
			return false;
		}
	}, [activeProjectId, validatedOrganizationId, clearActiveProject, navigationStateHydrated]);

	const loadApplicationData = useCallback(async () => {
		if (!navigationStateHydrated) return false;
		if (!(activeApplicationId && activeProjectId && validatedOrganizationId)) return false;
		try {
			const application = await getApplication(validatedOrganizationId, activeProjectId, activeApplicationId);
			useApplicationStore.getState().setApplication(application);
			return true;
		} catch (error) {
			log.error("Failed to load application data", {
				activeApplicationId,
				activeProjectId,
				error,
				validatedOrganizationId,
			});
			clearActiveApplication();
			return false;
		}
	}, [
		activeApplicationId,
		activeProjectId,
		validatedOrganizationId,
		clearActiveApplication,
		navigationStateHydrated,
	]);

	const loadOrganizationData = useCallback(async () => {
		try {
			const organizations = await getOrganizations();
			useOrganizationStore.setState({ organizations });
		} catch (error) {
			log.error("Failed to load organization data", {
				error,
			});
			setError("Failed to load organization data");
		} finally {
			setOrganizationsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (organizationsLoading && !organizations.length) {
			void loadOrganizationData();
		}
	}, [organizationsLoading, organizations.length, loadOrganizationData]);

	const loadRequiredData = useCallback(async () => {
		if (!navigationStateHydrated) return false;

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
		navigationStateHydrated,
	]);

	useEffect(() => {
		if (!navigationStateHydrated || organizationsLoading) return;

		if (
			!validatedOrganizationId ||
			(requireProject && !activeProjectId) ||
			(requireApplication && !activeApplicationId)
		) {
			router.replace(redirectTo);
			return;
		}

		void loadRequiredData();
	}, [
		validatedOrganizationId,
		requireProject,
		requireApplication,
		activeProjectId,
		activeApplicationId,
		redirectTo,
		router,
		loadRequiredData,
		navigationStateHydrated,
		organizationsLoading,
	]);

	useEffect(() => {
		if (!navigationStateHydrated) return;

		if (!error) return;

		const timeoutId = setTimeout(() => {
			router.replace(redirectTo);
		}, 2000);

		return () => {
			clearTimeout(timeoutId);
		};
	}, [error, router, redirectTo, navigationStateHydrated]);

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
