import { expect, test } from "@playwright/test";
import { acceptCookieConsent, E2E_TEST_USER, mockFirebaseAuth } from "./helpers/auth";

const TEST_USER_EMAIL = E2E_TEST_USER.email;

test.describe("Login Flow", () => {
	test.beforeEach(async ({ page }) => {
		await acceptCookieConsent(page);
		await mockFirebaseAuth(page);
	});

	test("should display login page elements", async ({ page }) => {
		await page.goto("/login");

		await expect(page).toHaveURL(/\/login/);

		await expect(page.getByText(/Welcome back/i)).toBeVisible();
		await expect(page.getByText(/Log in to manage your grant workflow/i)).toBeVisible();

		await expect(page.getByTestId("login-form-email-input")).toBeVisible();
		await expect(page.getByTestId("login-form-submit-button")).toBeVisible();

		await expect(page.getByTestId("login-google-button")).toBeVisible();
		await expect(page.getByTestId("login-orcid-button")).toBeVisible();

		await expect(page.getByTestId("login-create-account-link")).toBeVisible();
	});

	test.skip("should login successfully with valid credentials", async () => {
		// TODO: Enable once login form data-testids are added
		// await expect(page).toHaveURL(/\/projects/);
		// await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
		// await expect(page.getByText(E2E_TEST_USER.displayName)).toBeVisible();

		expect(TEST_USER_EMAIL).toBeTruthy();
	});

	test.skip("should show error with invalid email", async ({ page }) => {
		// TODO: Enable once error handling is implemented in login form
		// await expect(page.getByText(/invalid email|email format/i)).toBeVisible();
		// await expect(page).toHaveURL(/\/login/);

		expect(page).toBeTruthy();
	});

	test.skip("should show error with wrong password", async ({ page }) => {
		// TODO: Enable once Firebase error handling is wired up
		// await expect(page.getByText(/wrong password|invalid credentials/i)).toBeVisible();
		// await expect(page).toHaveURL(/\/login/);

		expect(page).toBeTruthy();
	});

	test.skip("should show loading state during login", async ({ page }) => {
		// TODO: Enable once loading states are implemented
		// await expect(page.getByTestId('login-loading')).toBeVisible();
		// await expect(page.getByTestId('login-loading')).not.toBeVisible();

		expect(page).toBeTruthy();
	});

	test.skip("should redirect authenticated users away from login", async ({ page }) => {
		// TODO: Enable once auth redirect logic is implemented
		// await expect(page).toHaveURL(/\/projects/);

		expect(page).toBeTruthy();
	});

	test("should have cookie consent integration", async ({ page }) => {
		await page.goto("/login");

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

		await expect(submitButton).toBeDisabled();

		await emailInput.fill("invalid-email");
		await emailInput.blur();

		await expect(submitButton).toBeDisabled();

		await emailInput.fill(TEST_USER_EMAIL);
		await emailInput.blur();

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

	test("should have visible title", async ({ page }) => {
		await page.goto("/login");

		const title = page.getByTestId("auth-card-title");
		await expect(title).toBeVisible();
		await expect(title).toHaveText("Welcome back!");
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
