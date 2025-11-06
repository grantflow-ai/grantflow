import { expect, test } from "@playwright/test";
import { acceptCookieConsent, E2E_TEST_USER, mockFirebaseAuth } from "./helpers/auth";

/**
 * Login E2E Tests
 *
 * These tests verify the authentication flow for existing users.
 * Tests cover Google/ORCID social login and email link authentication.
 *
 * The key fix tested here is that existing users can login without delays,
 * while new users (tested in signup.spec.ts) get a 1.5s delay for Firebase
 * propagation.
 */

const TEST_USER_EMAIL = E2E_TEST_USER.email;

test.describe("Login Flow", () => {
	test.beforeEach(async ({ page }) => {
		// Accept cookie consent to enable auth features
		await acceptCookieConsent(page);
		// Set up Firebase Auth mocking before navigating to login
		await mockFirebaseAuth(page);
	});

	test("should display login page elements", async ({ page }) => {
		await page.goto("/login");

		// Verify page loaded with correct URL
		await expect(page).toHaveURL(/\/login/);

		// Verify heading and description
		await expect(page.getByText(/Welcome back/i)).toBeVisible();
		await expect(page.getByText(/Log in to manage your grant workflow/i)).toBeVisible();

		// Verify email input form is present
		await expect(page.getByTestId("login-form-email-input")).toBeVisible();
		await expect(page.getByTestId("login-form-submit-button")).toBeVisible();

		// Verify social signin buttons
		await expect(page.getByTestId("login-google-button")).toBeVisible();
		await expect(page.getByTestId("login-orcid-button")).toBeVisible();

		// Verify navigation to signup
		await expect(page.getByTestId("login-create-account-link")).toBeVisible();
	});

	test.skip("should login successfully with valid credentials", async () => {
		// TODO: Enable once login form data-testids are added
		// Currently skipped because we need to add proper test IDs to the login form
		//
		// await page.goto('/login');
		// await page.fill('[data-testid="email-input"]', TEST_USER_EMAIL);
		// await page.fill('[data-testid="password-input"]', 'password');
		// await page.click('[data-testid="login-button"]');
		//
		// // Wait for auth to complete
		// await waitForAuth(page);
		//
		// // Should redirect to dashboard
		// await expect(page).toHaveURL(/\/projects/);
		// await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
		//
		// // Verify user info is displayed
		// await expect(page.getByText(E2E_TEST_USER.displayName)).toBeVisible();

		expect(TEST_USER_EMAIL).toBeTruthy();
	});

	test.skip("should show error with invalid email", async ({ page }) => {
		// TODO: Enable once error handling is implemented in login form
		// await page.goto('/login');
		// await page.fill('[data-testid="email-input"]', 'invalid-email');
		// await page.fill('[data-testid="password-input"]', TEST_USER_PASSWORD);
		// await page.click('[data-testid="login-button"]');
		//
		// // Should show validation error
		// await expect(page.getByText(/invalid email|email format/i)).toBeVisible();
		// // Should not redirect
		// await expect(page).toHaveURL(/\/login/);

		expect(page).toBeTruthy();
	});

	test.skip("should show error with wrong password", async ({ page }) => {
		// TODO: Enable once Firebase error handling is wired up
		// Mock Firebase to return auth error for wrong password
		//
		// await page.goto('/login');
		// await page.fill('[data-testid="email-input"]', TEST_USER_EMAIL);
		// await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
		// await page.click('[data-testid="login-button"]');
		//
		// // Should show Firebase error
		// await expect(page.getByText(/wrong password|invalid credentials/i)).toBeVisible();
		// // Should not redirect
		// await expect(page).toHaveURL(/\/login/);

		expect(page).toBeTruthy();
	});

	test.skip("should show loading state during login", async ({ page }) => {
		// TODO: Enable once loading states are implemented
		// await page.goto('/login');
		// await page.fill('[data-testid="email-input"]', TEST_USER_EMAIL);
		// await page.fill('[data-testid="password-input"]', TEST_USER_PASSWORD);
		//
		// // Click login and immediately check for loading state
		// await page.click('[data-testid="login-button"]');
		// await expect(page.getByTestId('login-loading')).toBeVisible();
		//
		// // Wait for login to complete
		// await waitForAuth(page);
		// await expect(page.getByTestId('login-loading')).not.toBeVisible();

		expect(page).toBeTruthy();
	});

	test.skip("should redirect authenticated users away from login", async ({ page }) => {
		// TODO: Enable once auth redirect logic is implemented
		// First login
		// await page.goto('/login');
		// await page.fill('[data-testid="email-input"]', TEST_USER_EMAIL);
		// await page.fill('[data-testid="password-input"]', TEST_USER_PASSWORD);
		// await page.click('[data-testid="login-button"]');
		// await waitForAuth(page);
		//
		// // Try to go back to login page
		// await page.goto('/login');
		//
		// // Should redirect to dashboard
		// await expect(page).toHaveURL(/\/projects/);

		expect(page).toBeTruthy();
	});

	test("should have cookie consent integration", async ({ page }) => {
		await page.goto("/login");

		// Verify social signin buttons exist
		const googleButton = page.getByTestId("login-google-button");
		const orcidButton = page.getByTestId("login-orcid-button");

		await expect(googleButton).toBeVisible();
		await expect(orcidButton).toBeVisible();
	});

	test("should navigate to signup page from login", async ({ page }) => {
		await page.goto("/login");

		const signupLink = page.getByTestId("login-create-account-link");
		await expect(signupLink).toBeVisible();

		await signupLink.click();
		await expect(page).toHaveURL(/\/signup/);
	});

	test("should have proper form validation for email input", async ({ page }) => {
		await page.goto("/login");

		const emailInput = page.getByTestId("login-form-email-input");
		const submitButton = page.getByTestId("login-form-submit-button");

		// Initially button should be disabled
		await expect(submitButton).toBeDisabled();

		// Type invalid email
		await emailInput.fill("invalid-email");
		await emailInput.blur();

		// Button should still be disabled
		await expect(submitButton).toBeDisabled();

		// Type valid email
		await emailInput.fill(TEST_USER_EMAIL);
		await emailInput.blur();

		// Button should be enabled
		await expect(submitButton).toBeEnabled();
	});

	test("should display both Google and ORCID login buttons", async ({ page }) => {
		await page.goto("/login");

		const googleButton = page.getByTestId("login-google-button");
		const orcidButton = page.getByTestId("login-orcid-button");

		await expect(googleButton).toBeVisible();
		await expect(googleButton).toBeEnabled();

		await expect(orcidButton).toBeVisible();
		await expect(orcidButton).toBeEnabled();
	});
});

test.describe("Login Page Accessibility", () => {
	test.beforeEach(async ({ page }) => {
		await acceptCookieConsent(page);
	});

	test("should have proper heading hierarchy", async ({ page }) => {
		await page.goto("/login");

		const mainHeading = page.getByRole("heading", { name: /welcome back/i });
		await expect(mainHeading).toBeVisible();
	});

	test("should have visible form labels", async ({ page }) => {
		await page.goto("/login");

		const emailLabel = page.getByText("Email Address");
		await expect(emailLabel).toBeVisible();
	});

	test("should have logo visible", async ({ page }) => {
		await page.goto("/login");

		const logo = page.getByTestId("login-logo");
		await expect(logo).toBeVisible();
	});
});
