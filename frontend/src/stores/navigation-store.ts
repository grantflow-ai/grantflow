import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NavigationActions {
	clearActiveApplication: () => void;
	clearActiveProject: () => void;

	goBack: () => {
		applicationId: null | string;
		projectId: null | string;
	} | null;
	navigateToApplication: (
		projectId: string,
		projectName: string,
		applicationId: string,
		applicationTitle: string,
	) => void;

	navigateToProject: (projectId: string, projectName: string) => void;

	pushToHistory: (path: string) => void;

	reset: () => void;

	setActiveApplication: (applicationId: string, applicationTitle: string) => void;

	setActiveProject: (projectId: string, projectName: string) => void;

	setStateHydrated: (stateHydrated: boolean) => void;
}

interface NavigationContext {
	activeApplicationId: null | string;
	activeApplicationTitle: null | string;

	activeProjectId: null | string;
	activeProjectName: null | string;

	navigationHistory: {
		applicationId: null | string;
		path: string;
		projectId: null | string;
		timestamp: number;
	}[];

	stateHydrated: boolean;
}

const initialState: NavigationContext = {
	activeApplicationId: null,
	activeApplicationTitle: null,
	activeProjectId: null,
	activeProjectName: null,
	navigationHistory: [],
	stateHydrated: false,
};

const handleRehydration = (state: (NavigationActions & NavigationContext) | undefined) => {
	state?.setStateHydrated(true);
};

const onRehydrateStorage = () => handleRehydration;

export const useNavigationStore = create<NavigationActions & NavigationContext>()(
	persist(
		(set, get) => ({
			...initialState,

			clearActiveApplication: () => {
				set({
					activeApplicationId: null,
					activeApplicationTitle: null,
				});
			},

			clearActiveProject: () => {
				set({
					activeApplicationId: null,
					activeApplicationTitle: null,
					activeProjectId: null,
					activeProjectName: null,
				});
			},

			goBack: () => {
				const { navigationHistory } = get();
				if (navigationHistory.length > 1) {
					const updatedHistory = navigationHistory.slice(0, -1);
					const previousEntry = updatedHistory.at(-1);

					set({
						activeApplicationId: previousEntry?.applicationId ?? null,
						activeApplicationTitle: null,
						activeProjectId: previousEntry?.projectId ?? null,
						activeProjectName: null,
						navigationHistory: updatedHistory,
					});

					return previousEntry ?? null;
				}
				return null;
			},

			navigateToApplication: (
				projectId: string,
				projectName: string,
				applicationId: string,
				applicationTitle: string,
			) => {
				const { pushToHistory, setActiveApplication, setActiveProject } = get();
				pushToHistory(globalThis.location.pathname);
				setActiveProject(projectId, projectName);
				setActiveApplication(applicationId, applicationTitle);
			},

			navigateToProject: (projectId: string, projectName: string) => {
				const { pushToHistory, setActiveProject } = get();
				pushToHistory(globalThis.location.pathname);
				setActiveProject(projectId, projectName);
			},

			pushToHistory: (path: string) => {
				const { activeApplicationId, activeProjectId, navigationHistory } = get();
				const newEntry = {
					applicationId: activeApplicationId,
					path,
					projectId: activeProjectId,
					timestamp: Date.now(),
				};

				const updatedHistory = [...navigationHistory, newEntry].slice(-20);
				set({ navigationHistory: updatedHistory });
			},

			reset: () => {
				set({ ...initialState, stateHydrated: true });
			},

			setActiveApplication: (applicationId: string, applicationTitle: string) => {
				const { activeProjectId } = get();
				if (!activeProjectId) {
					return;
				}

				set({
					activeApplicationId: applicationId,
					activeApplicationTitle: applicationTitle,
				});
			},

			setActiveProject: (projectId: string, projectName: string) => {
				set({
					activeApplicationId: null,
					activeApplicationTitle: null,
					activeProjectId: projectId,
					activeProjectName: projectName,
				});
			},

			setStateHydrated: (stateHydrated: boolean) => {
				set({ stateHydrated });
			},
		}),
		{
			name: "navigation-store",
			onRehydrateStorage,
		},
	),
);
