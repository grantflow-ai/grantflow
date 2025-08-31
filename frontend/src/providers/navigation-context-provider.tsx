"use client";

import { useRouter } from "next/navigation";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { getApplication } from "@/actions/grant-applications";
import { getProject } from "@/actions/project";
import { LoadingState } from "@/components/organizations/project/loading-state";
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
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<null | string>(null);

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
			setIsLoading(true);
			setError(null);

			if (activeProjectId && !(await loadProjectData()) && requireProject) {
				router.replace(redirectTo);
				setIsLoading(false);
				return;
			}

			if (activeApplicationId && !(await loadApplicationData()) && requireApplication) {
				router.replace(redirectTo);
				setIsLoading(false);
				return;
			}

			setIsLoading(false);
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

	if (isLoading) {
		return <LoadingState />;
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
				<p className="text-red-600">{error}</p>
				<button
					className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
					onClick={() => {
						router.push(redirectTo);
					}}
					type="button"
				>
					Go Back
				</button>
			</div>
		);
	}

	return <>{children}</>;
}
