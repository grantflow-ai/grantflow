import { useApplicationStore } from "@/stores/application-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { useUserStore } from "@/stores/user-store";
import { useWizardStore } from "@/stores/wizard-store";
import { log } from "@/utils/logger/client";

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
	try {
		useApplicationStore.getState().reset();
	} catch (error) {
		log.warn("Failed to reset application store:", { error });
	}

	try {
		useNavigationStore.getState().reset();
	} catch (error) {
		log.warn("Failed to reset navigation store:", { error });
	}

	try {
		useProjectStore.getState().reset();
	} catch (error) {
		log.warn("Failed to reset project store:", { error });
	}

	try {
		useWizardStore.getState().reset();
	} catch (error) {
		log.warn("Failed to reset wizard store:", { error });
	}

	useNotificationStore.getState().clearAllNotifications();
	useUserStore.getState().clearUser();

	try {
		useOrganizationStore.getState().clearOrganization();
	} catch {}

	useOrganizationStore.setState({
		organization: null,
		organizations: [],
		selectedOrganizationId: null,
	});
	clearPersistedStoreData();
}

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
			} catch {}
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

function clearPersistedStoreData(): void {
	const persistedStoreKeys = ["navigation-store", "user-store", "wizard-store", "organization-store"];

	persistedStoreKeys.forEach((key) => {
		try {
			localStorage.removeItem(key);
		} catch {}
	});
}
