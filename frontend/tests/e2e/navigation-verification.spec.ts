import { expect, test } from "@playwright/test";

test.describe("Navigation System Verification", () => {
	test("should use clean URLs without parameters", async ({ page }) => {
		await page.goto("/login");

		await expect(page).toHaveURL("/login");

		await page.goto("/projects");

		await expect(page).toHaveURL("/projects");

		await expect(page.locator('[data-testid="dashboard-project-card"]').first()).toBeVisible();
	});

	test("should navigate to project detail with clean URL", async ({ page }) => {
		await page.goto("/project");

		await expect(page).toHaveURL("/project");

		await expect(page.locator('[data-testid="new-application-button"]')).toBeVisible();
	});

	test("should navigate to application wizard with clean URL", async ({ page }) => {
		await page.goto("/application/wizard");

		await expect(page).toHaveURL("/application/wizard");

		await expect(page.locator('[data-testid="wizard-progress-bar"]')).toBeVisible();
	});

	test("should navigate to application editor with clean URL", async ({ page }) => {
		await page.goto("/application/editor");

		await expect(page).toHaveURL("/application/editor");

		await expect(page.locator("body")).toBeVisible();
	});

	test("should navigate to settings with clean URLs", async ({ page }) => {
		await page.goto("/project/settings/account");
		await expect(page).toHaveURL("/project/settings/account");
		await expect(page.locator("body")).toBeVisible();

		await page.goto("/project/settings/billing");
		await expect(page).toHaveURL("/project/settings/billing");
		await expect(page.locator("body")).toBeVisible();

		await page.goto("/project/settings/members");
		await expect(page).toHaveURL("/project/settings/members");
		await expect(page.locator("body")).toBeVisible();

		await page.goto("/project/settings/notifications");
		await expect(page).toHaveURL("/project/settings/notifications");
		await expect(page.locator("body")).toBeVisible();
	});
});
