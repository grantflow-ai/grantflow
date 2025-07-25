import { dismissWelcomeModal } from "./helpers/dismiss-welcome-modal";
import { expect, test } from "./test-setup";

test.describe("Comprehensive Navigation Tests", () => {
	test("should navigate through all public pages", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveURL("/");
		await expect(page.locator('[data-testid="hero-banner"]')).toBeVisible();

		await page.goto("/about");
		await expect(page).toHaveURL("/about");

		await expect(page.locator("body")).toBeVisible();

		await page.goto("/terms");
		await expect(page).toHaveURL("/terms");
		await expect(page.getByRole("heading", { name: "Terms of Use" })).toBeVisible();

		await page.goto("/privacy");
		await expect(page).toHaveURL("/privacy");

		await expect(page.getByRole("heading", { name: "Privacy Policy" }).first()).toBeVisible();

		await page.goto("/");
		await expect(page).toHaveURL("/");
		await expect(page.locator('[data-testid="hero-banner"]')).toBeVisible();
	});

	test("should navigate through authentication flow", async ({ page }) => {
		await page.goto("/login");
		await expect(page).toHaveURL("/login");

		await page.goto("/projects");
		await expect(page).toHaveURL("/projects");

		await dismissWelcomeModal(page);

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should navigate through main application pages", async ({ page }) => {
		await page.goto("/projects");
		await expect(page).toHaveURL("/projects");

		await dismissWelcomeModal(page);

		await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();

		const projectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		if (await projectCard.isVisible()) {
			await projectCard.click();

			await page.waitForLoadState("networkidle");

			await expect(page).toHaveURL("/project");

			await expect(page.locator("main").locator('[data-testid="new-application-button"]')).toBeVisible();

			await page.locator("main").locator('[data-testid="new-application-button"]').click();

			await expect(page).toHaveURL(/\/wizard/);
		}
	});

	test("should navigate through settings pages", async ({ page }) => {
		await page.goto("/projects");
		await dismissWelcomeModal(page);

		const projectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		if (await projectCard.isVisible()) {
			await projectCard.click();

			await page.waitForLoadState("networkidle");

			await expect(page).toHaveURL("/project");

			await page.goto("/project/settings/account");
			await expect(page).toHaveURL("/project/settings/account");

			await expect(page.locator('[data-testid="settings-container"]')).toBeVisible();

			const billingTab = page.locator('[data-testid="settings-tab-billing"]');
			if (await billingTab.isVisible()) {
				await billingTab.click();
				await expect(page).toHaveURL("/project/settings/billing");
			}

			const membersTab = page.locator('[data-testid="settings-tab-members"]');
			if (await membersTab.isVisible()) {
				await membersTab.click();
				await expect(page).toHaveURL("/project/settings/members");
			}

			const notificationsTab = page.locator('[data-testid="settings-tab-notifications"]');
			if (await notificationsTab.isVisible()) {
				await notificationsTab.click();
				await expect(page).toHaveURL("/project/settings/notifications");
			}
		}
	});

	test("should handle navigation using sidebar", async ({ page }) => {
		await page.goto("/projects");

		await dismissWelcomeModal(page);

		const dashboardLink = page.locator('[data-testid="dashboard-section"]');
		if (await dashboardLink.isVisible()) {
			await dashboardLink.click();
			await expect(page).toHaveURL("/projects");
		}

		const projectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		if (await projectCard.isVisible()) {
			await projectCard.click();

			await page.waitForLoadState("networkidle");

			await expect(page).toHaveURL("/project");

			const settingsLink = page.locator('[data-testid="settings-account"]');
			if (await settingsLink.isVisible()) {
				await settingsLink.click();

				await expect(page).toHaveURL("/project/settings/account");
			}
		}
	});

	test("should handle back navigation correctly", async ({ page }) => {
		await page.goto("/projects");
		await dismissWelcomeModal(page);

		await page.goto("/");
		await page.goto("/about");
		await page.goto("/terms");

		await page.goBack();
		await expect(page).toHaveURL("/about");

		await page.goBack();
		await expect(page).toHaveURL("/");

		await page.goForward();
		await expect(page).toHaveURL("/about");

		await page.goForward();
		await expect(page).toHaveURL("/terms");
	});

	test("should handle direct URL navigation", async ({ page }) => {
		const routes = ["/", "/login", "/projects", "/about", "/terms", "/privacy"];

		for (const route of routes) {
			await page.goto(route);
			await expect(page).toHaveURL(route);

			await expect(page.locator("body")).toBeVisible();
		}
	});

	test("should maintain navigation context across pages", async ({ page }) => {
		await page.goto("/projects");
		await dismissWelcomeModal(page);

		const projectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		if (await projectCard.isVisible()) {
			await projectCard.click();

			await page.waitForLoadState("networkidle");

			await expect(page).toHaveURL("/project");

			await expect(page.locator("main").locator('[data-testid="new-application-button"]')).toBeVisible();

			await page.goto("/project/settings/account");
			await expect(page).toHaveURL("/project/settings/account");

			await expect(page.locator('[data-testid="settings-container"]')).toBeVisible();

			await page.goto("/project");
			await expect(page).toHaveURL("/project");

			await expect(page.locator("main").locator('[data-testid="new-application-button"]')).toBeVisible();
		}
	});

	test("should handle 404 pages gracefully", async ({ page }) => {
		await page.goto("/non-existent-page", { waitUntil: "domcontentloaded" });

		const url = page.url();

		expect(url).toContain("non-existent-page");

		await expect(page.locator("body")).toBeVisible();
	});

	test("should navigate through application creation flow", async ({ page }) => {
		await page.goto("/projects");
		await dismissWelcomeModal(page);

		const projectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		if (await projectCard.isVisible()) {
			await projectCard.click();

			await page.waitForLoadState("networkidle");

			await expect(page).toHaveURL("/project");

			await expect(page.locator("main").locator('[data-testid="new-application-button"]')).toBeVisible();

			const newAppButton = page.locator("main").locator('[data-testid="new-application-button"]');
			if (await newAppButton.isVisible()) {
				await newAppButton.click();

				await expect(page).toHaveURL(/\/wizard/);
			}
		}
	});
});
