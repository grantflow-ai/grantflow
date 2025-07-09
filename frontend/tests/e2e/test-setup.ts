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

		// Use the page
		await use(page);
	},
});

export { expect } from "@playwright/test";
