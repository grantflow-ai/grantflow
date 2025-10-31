/**
 * Authentication helpers for e2e tests
 *
 * These utilities allow tests to bypass the login UI flow and jump directly
 * to authenticated states, making tests faster and more focused on the
 * feature being tested rather than the login process.
 */

import type { Page } from "@playwright/test";

/**
 * Test user credentials that match the seeded e2e data
 */
export const E2E_TEST_USER = {
	applicationId: "00000000-0000-0000-0000-000000000003",
	displayName: "E2E Test User",
	email: "e2e.playwright+ci@grantflow.ai",
	organizationId: "00000000-0000-0000-0000-000000000001",
	projectId: "00000000-0000-0000-0000-000000000002",
	uid: "e2e-test-user-uid",
} as const;

/**
 * Mock Firebase Auth API responses for login testing
 * Use this when you actually want to test the login flow itself.
 *
 * @example
 * test('should login successfully', async ({ page }) => {
 *   await mockFirebaseAuth(page);
 *   await page.goto('/login');
 *   await page.fill('[data-testid="email-input"]', TEST_USER.email);
 *   await page.fill('[data-testid="password-input"]', 'password');
 *   await page.click('[data-testid="login-button"]');
 *   await expect(page).toHaveURL('/projects');
 * });
 */
export async function mockFirebaseAuth(page: Page): Promise<void> {
	const mockToken = generateMockIdToken();

	// Intercept Firebase Auth API calls
	await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
		const url = route.request().url();

		if (url.includes("accounts:signInWithPassword")) {
			// Mock successful login
			await route.fulfill({
				body: JSON.stringify({
					displayName: E2E_TEST_USER.displayName,
					email: E2E_TEST_USER.email,
					expiresIn: "3600",
					idToken: mockToken,
					kind: "identitytoolkit#VerifyPasswordResponse",
					localId: E2E_TEST_USER.uid,
					refreshToken: "mock-refresh-token",
					registered: true,
				}),
				contentType: "application/json",
			});
		} else if (url.includes("accounts:lookup")) {
			// Mock user info lookup
			await route.fulfill({
				body: JSON.stringify({
					kind: "identitytoolkit#GetAccountInfoResponse",
					users: [
						{
							displayName: E2E_TEST_USER.displayName,
							email: E2E_TEST_USER.email,
							emailVerified: true,
							localId: E2E_TEST_USER.uid,
							providerUserInfo: [
								{
									email: E2E_TEST_USER.email,
									federatedId: E2E_TEST_USER.email,
									providerId: "password",
									rawId: E2E_TEST_USER.email,
								},
							],
						},
					],
				}),
				contentType: "application/json",
			});
		} else {
			// Pass through other requests
			await route.continue();
		}
	});

	// Also intercept token refresh calls
	await page.route("**/securetoken.googleapis.com/**", async (route) => {
		await route.fulfill({
			body: JSON.stringify({
				access_token: mockToken,
				expires_in: "3600",
				id_token: mockToken,
				project_id: "grantflow",
				refresh_token: "mock-refresh-token",
				token_type: "Bearer",
				user_id: E2E_TEST_USER.uid,
			}),
			contentType: "application/json",
		});
	});
}

/**
 * Set up authenticated session by mocking Firebase auth state
 * This bypasses the login UI entirely and sets up the auth state directly.
 *
 * Use this when you want to test features that require authentication
 * but don't need to test the login flow itself.
 *
 * @example
 * test('should load dashboard', async ({ page }) => {
 *   await setupAuthenticatedSession(page);
 *   await page.goto('/projects');
 *   // Now authenticated, can test dashboard features
 * });
 */
export async function setupAuthenticatedSession(page: Page): Promise<void> {
	const mockToken = generateMockIdToken();

	// Set up Firebase auth state in localStorage
	// This mimics what Firebase SDK does after successful login
	await page.addInitScript(
		({ token, user }) => {
			// Firebase auth persistence
			const firebaseAuthKey = `firebase:authUser:${user.projectId}:[DEFAULT]`;
			localStorage.setItem(
				firebaseAuthKey,
				JSON.stringify({
					apiKey: "mock-api-key",
					appName: "[DEFAULT]",
					createdAt: Date.now().toString(),
					displayName: user.displayName,
					email: user.email,
					emailVerified: true,
					isAnonymous: false,
					lastLoginAt: Date.now().toString(),
					providerData: [
						{
							displayName: user.displayName,
							email: user.email,
							phoneNumber: null,
							photoURL: null,
							providerId: "password",
							uid: user.email,
						},
					],
					stsTokenManager: {
						accessToken: token,
						expirationTime: Date.now() + 3_600_000,
						refreshToken: "mock-refresh-token",
					},
					uid: user.uid,
				}),
			);

			// App-specific user store (Zustand)
			localStorage.setItem(
				"user-store",
				JSON.stringify({
					state: {
						hasSeenWelcomeModal: true,
						isAuthenticated: true,
						user: {
							displayName: user.displayName,
							email: user.email,
							emailVerified: true,
							photoURL: null,
							providerId: "password",
							uid: user.uid,
						},
					},
					version: 0,
				}),
			);

			// Navigation store with test IDs
			localStorage.setItem(
				"navigation-store",
				JSON.stringify({
					state: {
						activeApplicationId: user.applicationId,
						activeProjectId: user.projectId,
					},
					version: 0,
				}),
			);
		},
		{
			token: mockToken,
			user: {
				applicationId: E2E_TEST_USER.applicationId,
				displayName: E2E_TEST_USER.displayName,
				email: E2E_TEST_USER.email,
				organizationId: E2E_TEST_USER.organizationId,
				projectId: E2E_TEST_USER.organizationId,
				uid: E2E_TEST_USER.uid,
			},
		},
	);
}

/**
 * Wait for authentication to complete
 * Useful after login or page navigation
 */
export async function waitForAuth(page: Page): Promise<void> {
	// Wait for user store to be populated
	await page.waitForFunction(() => {
		const userStore = localStorage.getItem("user-store");
		if (!userStore) return false;
		try {
			const parsed: unknown = JSON.parse(userStore);
			if (typeof parsed === "object" && parsed !== null && "state" in parsed) {
				const { state } = parsed as { state?: unknown };
				if (typeof state === "object" && state !== null && "isAuthenticated" in state) {
					return (state as { isAuthenticated?: boolean }).isAuthenticated === true;
				}
			}
			return false;
		} catch {
			return false;
		}
	});
}

/**
 * Mock Firebase ID token for e2e tests
 * In a real implementation, this would be generated by Firebase Auth Emulator
 */
function generateMockIdToken(): string {
	const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
	const payload = btoa(
		JSON.stringify({
			aud: "grantflow",
			auth_time: Math.floor(Date.now() / 1000),
			email: E2E_TEST_USER.email,
			email_verified: true,
			exp: Math.floor(Date.now() / 1000) + 3600,
			firebase: {
				identities: {
					email: [E2E_TEST_USER.email],
				},
				sign_in_provider: "password",
			},
			iat: Math.floor(Date.now() / 1000),
			iss: "https://securetoken.google.com/grantflow",
			organization_id: E2E_TEST_USER.organizationId,
			role: "OWNER",
			sub: E2E_TEST_USER.uid,
			user_id: E2E_TEST_USER.uid,
		}),
	);
	// Note: This is an unsigned token (alg: "none") for testing only
	return `${header}.${payload}.`;
}
