import type { Page } from "@playwright/test";

export async function acceptCookieConsent(page: Page): Promise<void> {
	const consentData = {
		consentGiven: true,
		hasInteracted: true,
		preferences: {
			analytics: true,
			essential: true,
		},
	};

	await page.context().addCookies([
		{
			domain: "localhost",
			expires: Date.now() / 1000 + 365 * 24 * 60 * 60,
			httpOnly: false,
			name: "grantflow_cookie_consent",
			path: "/",
			sameSite: "Strict",
			secure: false,
			value: encodeURIComponent(JSON.stringify(consentData)),
		},
	]);
}

export const E2E_TEST_USER = {
	applicationId: "00000000-0000-0000-0000-000000000003",
	displayName: "E2E Test User",
	email: "e2e.playwright+ci@grantflow.ai",
	organizationId: "00000000-0000-0000-0000-000000000001",
	projectId: "00000000-0000-0000-0000-000000000002",
	uid: "e2e-test-user-uid",
} as const;

export async function mockBackendLogin(page: Page): Promise<void> {
	const mockJwt = generateMockJWT();

	await page.route("**/login", async (route) => {
		await (route.request().method() === "POST"
			? route.fulfill({
					body: JSON.stringify({
						is_backoffice_admin: false,
						jwt_token: mockJwt,
					}),
					contentType: "application/json",
					status: 201,
				})
			: route.continue());
	});
}

export async function mockBackendOrganizations(page: Page): Promise<void> {
	await page.route("**/organizations", async (route) => {
		await (route.request().method() === "GET"
			? route.fulfill({
					body: JSON.stringify([
						{
							created_at: new Date().toISOString(),
							id: E2E_TEST_USER.organizationId,
							name: "E2E Test Organization",
							role: "OWNER",
							updated_at: new Date().toISOString(),
						},
					]),
					contentType: "application/json",
					status: 200,
				})
			: route.continue());
	});
}

/**
 * Setup Firebase Auth Emulator mocking for login/signup testing
 * This mocks the backend endpoints but uses real Firebase Auth Emulator for authentication.
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
export async function mockFirebaseAuth(page: Page, _options?: { isNewUser?: boolean }): Promise<void> {
	await mockBackendLogin(page);

	await mockBackendOrganizations(page);
}

export async function mockGoogleOAuth(page: Page, options?: { isNewUser?: boolean }): Promise<void> {
	const mockToken = generateMockIdToken();
	const isNewUser = options?.isNewUser ?? false;

	await page.addInitScript(
		({ isNewUser, token: _token, user }) => {
			const originalOpen = window.open;
			window.open = (...args) => {
				const popup = originalOpen.apply(globalThis, args);

				setTimeout(() => {
					const event = new CustomEvent("firebaseAuthStateChanged", {
						detail: {
							displayName: user.displayName,
							email: user.email,
							emailVerified: true,
							isNewUser,
							photoURL: null,
							providerId: "google.com",
							uid: user.uid,
						},
					});
					globalThis.dispatchEvent(event);
				}, 100);

				return popup;
			};
		},
		{
			isNewUser,
			token: mockToken,
			user: E2E_TEST_USER,
		},
	);

	await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
		const url = route.request().url();

		await (url.includes("signInWithIdp") || url.includes("SignInWithIdp")
			? route.fulfill({
					body: JSON.stringify({
						displayName: E2E_TEST_USER.displayName,
						email: E2E_TEST_USER.email,
						expiresIn: "3600",
						federatedId: `https://accounts.google.com/${E2E_TEST_USER.uid}`,
						idToken: mockToken,
						kind: "identitytoolkit#VerifyAssertionResponse",
						localId: E2E_TEST_USER.uid,
						oauthAccessToken: "mock-oauth-access-token",
						oauthExpireIn: 3600,
						photoUrl: null,
						providerId: "google.com",
						rawUserInfo: JSON.stringify({
							email: E2E_TEST_USER.email,
							email_verified: true,
							name: E2E_TEST_USER.displayName,
							sub: E2E_TEST_USER.uid,
						}),
						refreshToken: "mock-refresh-token",
						...(isNewUser ? { isNewUser: true } : { registered: true }),
					}),
					contentType: "application/json",
				})
			: route.continue());
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

	await page.addInitScript(
		({ token, user }) => {
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

export async function waitForAuth(page: Page): Promise<void> {
	await page.waitForFunction(() => {
		const userStore = localStorage.getItem("user-store");
		if (!userStore) return false;
		try {
			const parsed: unknown = JSON.parse(userStore);
			if (typeof parsed === "object" && parsed !== null && "state" in parsed) {
				const { state } = parsed as { state?: unknown };
				if (typeof state === "object" && state !== null && "isAuthenticated" in state) {
					const typedState = state as { isAuthenticated?: boolean };
					return typedState.isAuthenticated ?? false;
				}
			}
			return false;
		} catch {
			return false;
		}
	});
}

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
	return `${header}.${payload}.`;
}

function generateMockJWT(): string {
	const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const payload = btoa(
		JSON.stringify({
			exp: Math.floor(Date.now() / 1000) + 3600,
			iat: Math.floor(Date.now() / 1000),
			organization_id: E2E_TEST_USER.organizationId,
			role: "OWNER",
			sub: E2E_TEST_USER.uid,
		}),
	);
	return `${header}.${payload}.mock-signature`;
}
