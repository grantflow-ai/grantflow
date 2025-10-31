import { expect, test } from "@playwright/test";
import { E2E_TEST_USER, mockFirebaseAuth } from "./helpers/auth";

/**
 * Login E2E Tests
 *
 * These tests verify the authentication flow using mocked Firebase Auth.
 * The mockFirebaseAuth() helper intercepts Firebase API calls and returns
 * test credentials, allowing us to test the full login UI flow without
 * requiring a real Firebase Auth Emulator.
 *
 * For tests that don't need to verify login flow, use setupAuthenticatedSession()
 * instead (see dashboard.spec.ts for examples).
 */

const TEST_USER_EMAIL = E2E_TEST_USER.email;
const TEST_USER_PASSWORD = process.env.E2E_TEST_USER_PASSWORD ?? "TestPassword123!";

test.describe("Login Flow", () => {
	test.beforeEach(async ({ page }) => {
		// Set up Firebase Auth mocking before navigating to login
		await mockFirebaseAuth(page);
	});

	test("should display login form", async ({ page }) => {
		await page.goto("/login");

		// Verify login form elements are present
		await expect(page.getByRole("heading", { name: /sign in|log in/i })).toBeVisible();
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();
		await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
	});

	test.skip("should login successfully with valid credentials", async () => {
		// TODO: Enable once login form data-testids are added
		// Currently skipped because we need to add proper test IDs to the login form
		//
		// await page.goto('/login');
		// await page.fill('[data-testid="email-input"]', TEST_USER_EMAIL);
		// await page.fill('[data-testid="password-input"]', TEST_USER_PASSWORD);
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
		expect(TEST_USER_PASSWORD).toBeTruthy();
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
});

test.describe("Password Reset", () => {
	test.skip("should navigate to password reset page", async ({ page }) => {
		// TODO: Implement password reset navigation test
		// await page.goto('/login');
		// await page.click('[data-testid="forgot-password-link"]');
		// await expect(page).toHaveURL(/\/reset-password/);

		expect(page).toBeTruthy();
	});

	test.skip("should send password reset email", async ({ page }) => {
		// TODO: Implement password reset flow test
		// Mock Firebase password reset API
		// Fill in email and submit
		// Verify success message

		expect(page).toBeTruthy();
	});
});

test.describe("Sign Up Flow", () => {
	test.skip("should navigate to sign up page", async ({ page }) => {
		// TODO: Implement sign up navigation test
		// await page.goto('/login');
		// await page.click('[data-testid="sign-up-link"]');
		// await expect(page).toHaveURL(/\/sign-up|\/register/);

		expect(page).toBeTruthy();
	});

	test.skip("should create new account", async ({ page }) => {
		// TODO: Implement account creation test
		// Mock Firebase createUserWithEmailAndPassword
		// Fill in registration form
		// Submit and verify redirect to dashboard

		expect(page).toBeTruthy();
	});
});
