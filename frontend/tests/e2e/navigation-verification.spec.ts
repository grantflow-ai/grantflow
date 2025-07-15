import { expect, test } from "@playwright/test";

test.describe("Navigation System Verification", () => {
	test("should use clean URLs without parameters", async ({ page }) => {
		// Start at login page
		await page.goto("/login");

		// Should be on login page with clean URL
		await expect(page).toHaveURL("/login");

		// Navigate to projects (this will trigger auth bypass in mock mode)
		await page.goto("/projects");

		// Should see projects page with clean URL (no parameters)
		await expect(page).toHaveURL("/projects");

		// Verify page loads correctly - should show project cards or empty state
		await expect(page.locator('[data-testid="dashboard-project-card"]').first()).toBeVisible();
	});

	test("should navigate to project detail with clean URL", async ({ page }) => {
		// Go directly to project page
		await page.goto("/project");

		// Should be on project page with clean URL (no slug)
		await expect(page).toHaveURL("/project");

		// Should load project detail page content
		// This tests that our navigation context provider loads data correctly
		await expect(page.locator('[data-testid="new-application-button"]')).toBeVisible();
	});

	test("should navigate to application wizard with clean URL", async ({ page }) => {
		// Go directly to application wizard
		await page.goto("/application/wizard");

		// Should be on wizard page with clean URL (no parameters)
		await expect(page).toHaveURL("/application/wizard");

		// Should load wizard content - check for wizard-specific elements
		await expect(page.locator('[data-testid="wizard-progress-bar"]')).toBeVisible();
	});

	test("should navigate to application editor with clean URL", async ({ page }) => {
		// Go directly to application editor
		await page.goto("/application/editor");

		// Should be on editor page with clean URL (no parameters)
		await expect(page).toHaveURL("/application/editor");

		// Should load editor content - just check page is responsive
		await expect(page.locator("body")).toBeVisible();
	});

	test("should navigate to settings with clean URLs", async ({ page }) => {
		// Navigate to different settings pages and verify URL structure
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
