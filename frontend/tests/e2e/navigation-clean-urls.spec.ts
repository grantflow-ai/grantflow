import { expect, test } from "@playwright/test";

test.describe("Clean URL Navigation Verification", () => {
	test("should use clean URLs without parameters - CORE NAVIGATION TEST", async ({ page }) => {
		await page.goto("/login");
		await expect(page).toHaveURL("/login");

		await page.goto("/projects");
		await expect(page).toHaveURL("/projects");

		await page.goto("/project");
		await expect(page).toHaveURL("/project");

		await page.goto("/application/wizard");
		await expect(page).toHaveURL("/application/wizard");

		await page.goto("/application/editor");
		await expect(page).toHaveURL("/application/editor");

		await page.goto("/project/settings/account");
		await expect(page).toHaveURL("/project/settings/account");

		await page.goto("/project/settings/billing");
		await expect(page).toHaveURL("/project/settings/billing");

		await page.goto("/project/settings/members");
		await expect(page).toHaveURL("/project/settings/members");

		await page.goto("/project/settings/notifications");
		await expect(page).toHaveURL("/project/settings/notifications");
	});
});
