"use client";

import { useRouter } from "next/navigation";

import { type ReactNode, useCallback, useEffect } from "react";
import { getApplication } from "@/actions/grant-applications";
import { getProject } from "@/actions/project";
import { useApplicationStore } from "@/stores/application-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";

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

	const { activeApplicationId, activeProjectId, clearActiveApplication, clearActiveProject } = useNavigationStore();
	const { selectedOrganizationId } = useOrganizationStore();

	const { setProject } = useProjectStore();
	const { setApplication } = useApplicationStore();

	const loadProjectData = useCallback(async () => {
		if (!(activeProjectId && selectedOrganizationId)) return false;
		try {
			const project = await getProject(selectedOrganizationId, activeProjectId);
			setProject(project);
			return true;
		} catch {
			clearActiveProject();
			return false;
		}
	}, [activeProjectId, selectedOrganizationId, setProject, clearActiveProject]);

	const loadApplicationData = useCallback(async () => {
		if (!(activeApplicationId && activeProjectId && selectedOrganizationId)) return false;
		try {
			const application = await getApplication(selectedOrganizationId, activeProjectId, activeApplicationId);
			setApplication(application);
			return true;
		} catch {
			clearActiveApplication();
			return false;
		}
	}, [activeApplicationId, activeProjectId, selectedOrganizationId, setApplication, clearActiveApplication]);

	useEffect(() => {
		if (
			!selectedOrganizationId ||
			(requireProject && !activeProjectId) ||
			(requireApplication && !activeApplicationId)
		) {
			router.replace(redirectTo);
			return;
		}

		const loadData = async () => {
			if (activeProjectId && !(await loadProjectData()) && requireProject) {
				router.replace(redirectTo);
				return;
			}

			if (activeApplicationId && !(await loadApplicationData()) && requireApplication) {
				router.replace(redirectTo);
			}
		};

		void loadData();
	}, [
		activeProjectId,
		activeApplicationId,
		selectedOrganizationId,
		requireProject,
		requireApplication,
		redirectTo,
		router,
		loadProjectData,
		loadApplicationData,
	]);

	return <>{children}</>;
}
