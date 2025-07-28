import { expect, test } from "./test-setup";

test.describe("Settings Pages", () => {
	test("should verify auth bypass allows settings access", async ({ page }) => {
		await page.goto("/projects/1/settings/account");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="project-settings-account"]')).toBeVisible();

		expect(page.url()).toMatch(/\/projects\/1\/settings\/account$/);
	});

	test("should display account settings with mock data", async ({ page }) => {
		await page.goto("/projects/1/settings/account");
		await page.waitForLoadState("networkidle");

		const accountContainer = page.locator('[data-testid="project-settings-account"]');
		await expect(accountContainer).toBeVisible();

		const nameInput = page.locator('[data-testid="name-input"]');
		await expect(nameInput).toBeVisible();

		const emailInput = page.locator('[data-testid="email-input"]');
		await expect(emailInput).toBeVisible();

		const emailValue = await emailInput.inputValue();
		expect(emailValue).toBeTruthy();
		await expect(emailInput).toBeDisabled();
	});

	test("should navigate between settings tabs", async ({ page }) => {
		await page.goto("/projects/1/settings/account");
		await page.waitForLoadState("networkidle");
		await expect(page.locator('[data-testid="project-settings-account"]')).toBeVisible();

		await page.locator('[data-testid="settings-tab-members"]').click();
		await page.waitForURL(/\/projects\/1\/settings\/members$/);
		await expect(page.locator('[data-testid="project-settings-members"]')).toBeVisible();

		await page.locator('[data-testid="settings-tab-notifications"]').click();
		await page.waitForURL(/\/projects\/1\/settings\/notifications$/);
		await expect(page.locator('[data-testid="project-settings-notifications"]')).toBeVisible();

		await page.locator('[data-testid="settings-tab-billing"]').click();
		await page.waitForURL(/\/projects\/1\/settings\/billing$/);

		await expect(page.getByText("Billing & Payments content coming soon...")).toBeVisible();

		await page.locator('[data-testid="settings-tab-account"]').click();
		await page.waitForURL(/\/projects\/1\/settings\/account$/);
		await expect(page.locator('[data-testid="project-settings-account"]')).toBeVisible();
	});

	test("should display notifications page with toggle switches", async ({ page }) => {
		await page.goto("/projects/1/settings/notifications");
		await page.waitForLoadState("networkidle");

		const notificationsContainer = page.locator('[data-testid="project-settings-notifications"]');
		await expect(notificationsContainer).toBeVisible();

		const emailToggle = page.locator('[data-testid="email-notifications-toggle"]');
		const pushToggle = page.locator('[data-testid="push-notifications-toggle"]');
		const weeklyToggle = page.locator('[data-testid="weekly-summary-toggle"]');

		await expect(emailToggle).toBeVisible();
		await expect(pushToggle).toBeVisible();
		await expect(weeklyToggle).toBeVisible();
	});

	test("should toggle notification switches", async ({ page }) => {
		await page.goto("/projects/1/settings/notifications");
		await page.waitForLoadState("networkidle");

		const emailToggle = page.locator('[data-testid="email-notifications-toggle"]');
		const initialState = await emailToggle.getAttribute("aria-checked");

		await emailToggle.click();
		const newState = await emailToggle.getAttribute("aria-checked");
		expect(newState).not.toBe(initialState);
	});
});
