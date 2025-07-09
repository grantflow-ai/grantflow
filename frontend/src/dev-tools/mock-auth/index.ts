import { useUserStore } from "@/stores/user-store";
import { log } from "@/utils/logger";
import { createMockJwtToken, createMockUser } from "./user-factory";

/**
 * Clear mock authentication state
 */
export function clearMockAuth(): void {
	if (!isMockAuthEnabled()) {
		return;
	}

	useUserStore.getState().clearUser();
	log.info("Mock authentication cleared", { action: "clear_mock_auth" });
}

/**
 * Mock JWT token for development
 */
export function getMockJwtToken(): string {
	return createMockJwtToken();
}

/**
 * Initialize mock authentication state
 * Sets up user store and mock session for development
 */
export function initializeMockAuth(): void {
	if (!isMockAuthEnabled()) {
		return;
	}

	const mockUser = createMockUser();
	useUserStore.getState().setUser(mockUser);

	// Mark welcome modal as seen to avoid blocking tests
	useUserStore.getState().dismissWelcomeModal();

	log.info("Mock authentication initialized", {
		action: "init_mock_auth",
		provider: mockUser.providerId,
		user: mockUser.email,
	});
}

/**
 * Check if mock authentication is enabled
 */
export function isMockAuthEnabled(): boolean {
	const val = process.env.NEXT_PUBLIC_MOCK_AUTH;
	if (typeof val === "string") {
		return val.toLowerCase() === "true";
	}
	return false;
}
