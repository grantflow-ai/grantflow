import { expect, test } from "./test-setup";

test.describe("Settings Pages", () => {
	test("should verify auth bypass allows settings access", async ({ page }) => {
		// Direct navigation to settings page should work (auth bypass)
		await page.goto("/projects/1/settings/account");
		await page.waitForLoadState("networkidle");

		// Should be able to access settings directly without login redirect
		await expect(page.locator('[data-testid="project-settings-account"]')).toBeVisible();

		// Verify URL is correct
		expect(page.url()).toMatch(/\/projects\/1\/settings\/account$/);
	});

	test("should display account settings with mock data", async ({ page }) => {
		// Direct navigation to settings page (auth bypass test)
		await page.goto("/projects/1/settings/account");
		await page.waitForLoadState("networkidle");

		// Check that account settings page is visible
		const accountContainer = page.locator('[data-testid="project-settings-account"]');
		await expect(accountContainer).toBeVisible();

		// Verify mock user data is displayed
		const nameInput = page.locator('[data-testid="name-input"]');
		await expect(nameInput).toBeVisible();
		// The value might be empty in mock mode, just check that it's editable

		const emailInput = page.locator('[data-testid="email-input"]');
		await expect(emailInput).toBeVisible();
		// Check that email has some value (mock data might vary)
		const emailValue = await emailInput.inputValue();
		expect(emailValue).toBeTruthy();
		await expect(emailInput).toBeDisabled();
	});

	test("should navigate between settings tabs", async ({ page }) => {
		// Start at account settings
		await page.goto("/projects/1/settings/account");
		await page.waitForLoadState("networkidle");
		await expect(page.locator('[data-testid="project-settings-account"]')).toBeVisible();

		// Test navigation to members tab
		await page.locator('[data-testid="settings-tab-members"]').click();
		await page.waitForURL(/\/projects\/1\/settings\/members$/);
		await expect(page.locator('[data-testid="project-settings-members"]')).toBeVisible();

		// Test navigation to notifications tab
		await page.locator('[data-testid="settings-tab-notifications"]').click();
		await page.waitForURL(/\/projects\/1\/settings\/notifications$/);
		await expect(page.locator('[data-testid="project-settings-notifications"]')).toBeVisible();

		// Test navigation to billing tab
		await page.locator('[data-testid="settings-tab-billing"]').click();
		await page.waitForURL(/\/projects\/1\/settings\/billing$/);
		// Billing shows placeholder content
		await expect(page.getByText("Billing & Payments content coming soon...")).toBeVisible();

		// Navigate back to account tab
		await page.locator('[data-testid="settings-tab-account"]').click();
		await page.waitForURL(/\/projects\/1\/settings\/account$/);
		await expect(page.locator('[data-testid="project-settings-account"]')).toBeVisible();
	});

	test("should display notifications page with toggle switches", async ({ page }) => {
		// Navigate to notifications settings
		await page.goto("/projects/1/settings/notifications");
		await page.waitForLoadState("networkidle");

		// Verify notifications page is visible
		const notificationsContainer = page.locator('[data-testid="project-settings-notifications"]');
		await expect(notificationsContainer).toBeVisible();

		// Verify notification toggle switches are present
		const emailToggle = page.locator('[data-testid="email-notifications-toggle"]');
		const pushToggle = page.locator('[data-testid="push-notifications-toggle"]');
		const weeklyToggle = page.locator('[data-testid="weekly-summary-toggle"]');

		await expect(emailToggle).toBeVisible();
		await expect(pushToggle).toBeVisible();
		await expect(weeklyToggle).toBeVisible();
	});

	test("should toggle notification switches", async ({ page }) => {
		// Navigate to notifications settings
		await page.goto("/projects/1/settings/notifications");
		await page.waitForLoadState("networkidle");

		// Test toggling email notifications
		const emailToggle = page.locator('[data-testid="email-notifications-toggle"]');
		const initialState = await emailToggle.getAttribute("aria-checked");

		await emailToggle.click();
		const newState = await emailToggle.getAttribute("aria-checked");
		expect(newState).not.toBe(initialState);
	});
});
