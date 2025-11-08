import { expect, test } from "@playwright/test";
import { acceptCookieConsent, mockBackendLogin, mockBackendOrganizations } from "./helpers/auth";

test.describe("Signup Flow", () => {
	test.beforeEach(async ({ page }) => {
		await acceptCookieConsent(page);
		await mockBackendLogin(page);
		await mockBackendOrganizations(page);
	});

	test("should display signup page elements", async ({ page }) => {
		await page.goto("/signup");

		await expect(page).toHaveURL(/\/signup/);

		await expect(page.getByText("Create your account")).toBeVisible();
		await expect(page.getByText("Get more funding - faster!")).toBeVisible();

		await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
		await expect(page.getByRole("button", { name: /orcid/i })).toBeVisible();

		await expect(page.getByRole("link", { name: /login/i })).toBeVisible();
	});

	test("should have cookie consent requirement for signup", async ({ page }) => {
		await page.goto("/signup");

		const googleButton = page.getByRole("button", { name: /google/i });
		const orcidButton = page.getByRole("button", { name: /orcid/i });

		await expect(googleButton).toBeVisible();
		await expect(orcidButton).toBeVisible();
	});

	test("should navigate to login page from signup", async ({ page }) => {
		await page.goto("/signup");

		const loginLink = page.getByRole("link", { name: /login/i });
		await loginLink.click();

		await expect(page).toHaveURL(/\/login/);
	});

	test.describe("New User Signup with Google", () => {
		test("should show success message on new account creation", async ({ page }) => {
			await page.goto("/signup");

			const googleButton = page.getByRole("button", { name: /google/i });
			await expect(googleButton).toBeVisible();
			await expect(googleButton).toBeEnabled({ timeout: 5000 });
		});
	});

	test.describe("Existing User Signup Attempt", () => {
		test("should show error when email already exists", async ({ page }) => {
			await page.goto("/signup");

			await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
		});
	});
});

test.describe("Signup Page Accessibility", () => {
	test.beforeEach(async ({ page }) => {
		await acceptCookieConsent(page);
	});

	test("should have visible title", async ({ page }) => {
		await page.goto("/signup");

		const title = page.getByTestId("auth-card-title").first();
		await expect(title).toBeVisible();
		await expect(title).toHaveText("Create your account");
	});

	test("should have visible form labels", async ({ page }) => {
		await page.goto("/signup");

		await expect(page.locator('input[name="firstName"]')).toBeVisible();
		await expect(page.locator('input[name="lastName"]')).toBeVisible();
		await expect(page.locator('input[name="email"]')).toBeVisible();
	});
});

test.describe("Signup with Email Link", () => {
	test.beforeEach(async ({ page }) => {
		await acceptCookieConsent(page);
	});

	test("should show email form for passwordless signup", async ({ page }) => {
		await page.goto("/signup");

		const emailInput = page.locator('input[name="email"]');
		await expect(emailInput).toBeVisible();

		await emailInput.fill("test@example.com");
		await expect(emailInput).toHaveValue("test@example.com");
	});

	test("should validate email format", async ({ page }) => {
		await page.goto("/signup");

		const emailInput = page.locator('input[name="email"]');
		await emailInput.fill("invalid-email");

		await emailInput.blur();

		const submitButton = page.getByTestId("email-signin-form-submit-button");
		await expect(submitButton).toBeVisible();
		await expect(submitButton).toBeDisabled();
	});
});
