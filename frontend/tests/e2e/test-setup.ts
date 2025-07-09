import { test as base } from "@playwright/test";

// Extend the base test to include setup
export const test = base.extend({
	// Auto-fixture that runs before each test
	page: async ({ page }, use) => {
		// Clear local storage to ensure clean state
		await page.addInitScript(() => {
			localStorage.clear();
			sessionStorage.clear();
		});

		// Set mock auth flag in localStorage before navigation
		await page.addInitScript(() => {
			// Ensure user store has proper state
			const userStore = {
				state: {
					hasSeenWelcomeModal: true,
					isAuthenticated: true,
					user: {
						displayName: "Test User",
						email: "test@example.com",
						emailVerified: true,
						photoURL: null,
						providerId: "password",
						uid: "mock-user-123",
					},
				},
				version: 0,
			};
			localStorage.setItem("user-store", JSON.stringify(userStore));
		});

		// Configure mock API for faster tests
		await page.addInitScript(() => {
			// Set up faster mock API delays for testing
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(globalThis as any).__MOCK_API_DELAY__ = 100; // 100ms instead of 3000ms

			// Clear mock stores to ensure consistent test state
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if ((globalThis as any).clearAllMockStores) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
				(globalThis as any).clearAllMockStores();
			}
		});

		// Use the page
		await use(page);
	},
});

export { expect } from "@playwright/test";
