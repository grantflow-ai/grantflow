/**
 * Comprehensive store reset utility for testing
 *
 * This module provides utilities to reset all Zustand stores to their initial state
 * for proper test isolation. It handles both stores with built-in reset functions
 * and those requiring manual state reset.
 */

import { useApplicationStore } from "@/stores/application-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { useUserStore } from "@/stores/user-store";
import { useWizardStore } from "@/stores/wizard-store";

/**
 * Reset all Zustand stores to their initial state.
 *
 * This function should be called in beforeEach hooks to ensure test isolation.
 * It handles:
 * - Stores with built-in reset functions
 * - Stores requiring manual state reset
 * - Clearing persisted data from localStorage
 *
 * @example
 * ```typescript
 * import { resetAllStores } from "::testing/store-reset";
 *
 * beforeEach(() => {
 *   resetAllStores();
 *   vi.clearAllMocks();
 * });
 * ```
 */
export function resetAllStores(): void {
	// Reset stores with built-in reset functions
	useApplicationStore.getState().reset();
	useNavigationStore.getState().reset();
	useProjectStore.getState().reset();
	useWizardStore.getState().reset();

	// Reset stores with specific clear functions
	useNotificationStore.getState().clearAllNotifications();
	useUserStore.getState().clearUser();

	// Reset organization store - handle both real and mocked versions
	try {
		useOrganizationStore.getState().clearOrganization();
	} catch {
		// Fallback for mocked store that might not have clearOrganization function
	}

	// Manually reset organization store state to ensure clean state
	useOrganizationStore.setState({
		organization: null,
		organizations: [],
		selectedOrganizationId: null,
	});

	// Clear persisted data from localStorage to prevent state leakage between tests
	clearPersistedStoreData();
}

/**
 * Reset specific store by name.
 * Useful for testing specific store functionality in isolation.
 */
export function resetStore(
	storeName: "application" | "navigation" | "notification" | "organization" | "project" | "user" | "wizard",
): void {
	switch (storeName) {
		case "application": {
			useApplicationStore.getState().reset();
			break;
		}
		case "navigation": {
			useNavigationStore.getState().reset();
			break;
		}
		case "notification": {
			useNotificationStore.getState().clearAllNotifications();
			break;
		}
		case "organization": {
			try {
				useOrganizationStore.getState().clearOrganization();
			} catch {
				// Fallback for mocked store that might not have clearOrganization function
			}
			useOrganizationStore.setState({
				organization: null,
				organizations: [],
				selectedOrganizationId: null,
			});
			break;
		}
		case "project": {
			useProjectStore.getState().reset();
			break;
		}
		case "user": {
			useUserStore.getState().clearUser();
			break;
		}
		case "wizard": {
			useWizardStore.getState().reset();
			break;
		}
		default: {
			throw new Error(`Unknown store: ${storeName}`);
		}
	}
}

/**
 * Clear persisted store data from localStorage.
 *
 * Some stores use Zustand's persist middleware which saves state to localStorage.
 * This can cause test pollution if not properly cleared.
 */
function clearPersistedStoreData(): void {
	const persistedStoreKeys = ["navigation-store", "user-store", "wizard-store", "organization-store"];

	persistedStoreKeys.forEach((key) => {
		try {
			localStorage.removeItem(key);
		} catch {
			// Ignore localStorage errors in test environments that don't support it
		}
	});
}
