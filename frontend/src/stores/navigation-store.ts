import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Navigation store for managing application context without URL parameters
 * This replaces the previous URL-based navigation system to ensure clean URLs
 * without exposing internal IDs or sensitive information in the browser address bar
 */

interface NavigationActions {
	clearActiveApplication: () => void;
	clearActiveProject: () => void;

	goBack: () => { applicationId: null | string; projectId: null | string } | null;
	navigateToApplication: (
		projectId: string,
		projectName: string,
		applicationId: string,
		applicationTitle: string,
	) => void;

	// Combined navigation
	navigateToProject: (projectId: string, projectName: string) => void;
	// History management
	pushToHistory: (path: string) => void;

	// Clear all navigation state
	reset: () => void;
	// Application navigation
	setActiveApplication: (applicationId: string, applicationTitle: string) => void;

	// Project navigation
	setActiveProject: (projectId: string, projectName: string) => void;
}

interface NavigationContext {
	// Current active application
	activeApplicationId: null | string;
	activeApplicationTitle: null | string;

	// Current active project
	activeProjectId: null | string;
	activeProjectName: null | string;

	// Navigation history for back button support
	navigationHistory: {
		applicationId: null | string;
		path: string;
		projectId: null | string;
		timestamp: number;
	}[];
}

const initialState: NavigationContext = {
	activeApplicationId: null,
	activeApplicationTitle: null,
	activeProjectId: null,
	activeProjectName: null,
	navigationHistory: [],
};

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
					// Remove current entry and get previous
					const updatedHistory = navigationHistory.slice(0, -1);
					const previousEntry = updatedHistory.at(-1);

					set({
						activeApplicationId: previousEntry?.applicationId ?? null,
						activeApplicationTitle: null, // Will need to be fetched
						activeProjectId: previousEntry?.projectId ?? null,
						activeProjectName: null, // Will need to be fetched
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

				// Keep only last 20 entries
				const updatedHistory = [...navigationHistory, newEntry].slice(-20);
				set({ navigationHistory: updatedHistory });
			},

			reset: () => {
				set(initialState);
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
					// Clear application when changing projects
					activeApplicationId: null,
					activeApplicationTitle: null,
					activeProjectId: projectId,
					activeProjectName: projectName,
				});
			},
		}),
		{
			name: "navigation-store",
			partialize: (state) => ({
				activeApplicationId: state.activeApplicationId,
				activeApplicationTitle: state.activeApplicationTitle,
				// Only persist the active IDs, not the full history
				activeProjectId: state.activeProjectId,
				activeProjectName: state.activeProjectName,
			}),
		},
	),
);
