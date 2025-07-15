import { dismissWelcomeModal } from "./helpers/dismiss-welcome-modal";
import { expect, test } from "./test-setup";

test.describe("Comprehensive Navigation Tests", () => {
	test("should navigate through all public pages", async ({ page }) => {
		// Landing page
		await page.goto("/");
		await expect(page).toHaveURL("/");
		await expect(page.locator('[data-testid="hero-banner"]')).toBeVisible();

		// Navigate to About page directly
		await page.goto("/about");
		await expect(page).toHaveURL("/about");
		// Just verify the page loads
		await expect(page.locator("body")).toBeVisible();

		// Navigate to Terms page
		await page.goto("/terms");
		await expect(page).toHaveURL("/terms");
		await expect(page.getByRole("heading", { name: "Terms of Use" })).toBeVisible();

		// Navigate to Privacy page
		await page.goto("/privacy");
		await expect(page).toHaveURL("/privacy");
		// Use first() to get the main heading since there might be multiple
		await expect(page.getByRole("heading", { name: "Privacy Policy" }).first()).toBeVisible();

		// Navigate back to landing page
		await page.goto("/");
		await expect(page).toHaveURL("/");
		await expect(page.locator('[data-testid="hero-banner"]')).toBeVisible();
	});

	test("should navigate through authentication flow", async ({ page }) => {
		// Go to login page
		await page.goto("/login");
		await expect(page).toHaveURL("/login");

		// In mock mode, should redirect to projects
		await page.goto("/projects");
		await expect(page).toHaveURL("/projects");

		// Handle welcome modal
		await dismissWelcomeModal(page);

		// Verify dashboard is visible
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should navigate through main application pages", async ({ page }) => {
		// Start at projects dashboard
		await page.goto("/projects");
		await expect(page).toHaveURL("/projects");

		// Handle welcome modal
		await dismissWelcomeModal(page);

		// Verify dashboard is loaded
		await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();

		// Click on a project card to navigate to project detail
		const projectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		if (await projectCard.isVisible()) {
			await projectCard.click();
			// Wait for navigation to complete
			await page.waitForLoadState("networkidle");
			// Should navigate to clean project URL
			await expect(page).toHaveURL("/project");

			// Verify project page loaded - look for new application button in main content
			await expect(page.locator("main").locator('[data-testid="new-application-button"]')).toBeVisible();

			// Click new application button to go to wizard
			await page.locator("main").locator('[data-testid="new-application-button"]').click();
			// Should open application creation flow (wizard)
			await expect(page).toHaveURL(/\/wizard/);
		}
	});

	test("should navigate through settings pages", async ({ page }) => {
		// First establish project context by navigating to a project
		await page.goto("/projects");
		await dismissWelcomeModal(page);

		const projectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		if (await projectCard.isVisible()) {
			// Click project card
			await projectCard.click();
			// Wait for navigation to complete
			await page.waitForLoadState("networkidle");
			// Should navigate to clean project URL
			await expect(page).toHaveURL("/project");

			// Navigate to project settings using clean URLs
			await page.goto("/project/settings/account");
			await expect(page).toHaveURL("/project/settings/account");
			// Verify settings page is loaded
			await expect(page.locator('[data-testid="settings-container"]')).toBeVisible();

			// Navigate through settings tabs
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
		// Go to projects dashboard
		await page.goto("/projects");

		// Handle welcome modal
		await dismissWelcomeModal(page);

		// Click on Dashboard link
		const dashboardLink = page.locator('[data-testid="dashboard-section"]');
		if (await dashboardLink.isVisible()) {
			await dashboardLink.click();
			await expect(page).toHaveURL("/projects");
		}

		// First click on a project to enter it
		const projectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		if (await projectCard.isVisible()) {
			await projectCard.click();
			// Wait for navigation to complete
			await page.waitForLoadState("networkidle");
			// Should navigate to clean project URL
			await expect(page).toHaveURL("/project");

			// Now settings link should be visible in the sidebar
			const settingsLink = page.locator('[data-testid="settings-account"]');
			if (await settingsLink.isVisible()) {
				await settingsLink.click();
				// Should navigate to settings with clean URL
				await expect(page).toHaveURL("/project/settings/account");
			}
		}
	});

	test("should handle back navigation correctly", async ({ page }) => {
		// Navigate through multiple pages
		await page.goto("/projects");
		await dismissWelcomeModal(page);

		// Test basic back/forward navigation
		await page.goto("/");
		await page.goto("/about");
		await page.goto("/terms");

		// Use browser back button
		await page.goBack();
		await expect(page).toHaveURL("/about");

		await page.goBack();
		await expect(page).toHaveURL("/");

		// Forward navigation
		await page.goForward();
		await expect(page).toHaveURL("/about");

		await page.goForward();
		await expect(page).toHaveURL("/terms");
	});

	test("should handle direct URL navigation", async ({ page }) => {
		// Test direct navigation to nested routes
		const routes = ["/", "/login", "/projects", "/about", "/terms", "/privacy"];

		for (const route of routes) {
			await page.goto(route);
			await expect(page).toHaveURL(route);
			// Verify page loads without errors
			await expect(page.locator("body")).toBeVisible();
		}

		// Note: Routes like /project, /application/wizard, and /project/settings/* require
		// a project context to be established first, so they can't be tested with direct navigation
	});

	test("should maintain navigation context across pages", async ({ page }) => {
		// Go to projects dashboard
		await page.goto("/projects");
		await dismissWelcomeModal(page);

		// Select a project
		const projectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		if (await projectCard.isVisible()) {
			await projectCard.click();
			// Wait for navigation to complete
			await page.waitForLoadState("networkidle");
			// Should navigate to clean project URL
			await expect(page).toHaveURL("/project");

			// Verify project page loaded
			await expect(page.locator("main").locator('[data-testid="new-application-button"]')).toBeVisible();

			// Navigate to settings and back
			await page.goto("/project/settings/account");
			await expect(page).toHaveURL("/project/settings/account");
			// Verify settings page is loaded
			await expect(page.locator('[data-testid="settings-container"]')).toBeVisible();

			// Go back to project
			await page.goto("/project");
			await expect(page).toHaveURL("/project");

			// Context should be maintained - verify page loads
			await expect(page.locator("main").locator('[data-testid="new-application-button"]')).toBeVisible();
		}
	});

	test("should handle 404 pages gracefully", async ({ page }) => {
		// Navigate to non-existent route
		await page.goto("/non-existent-page", { waitUntil: "domcontentloaded" });

		// Should show the page (Next.js handles 404s)
		const url = page.url();
		// The app will show the page or a 404
		expect(url).toContain("non-existent-page");

		// Page should still be accessible
		await expect(page.locator("body")).toBeVisible();
	});

	test("should navigate through application creation flow", async ({ page }) => {
		// Start at projects
		await page.goto("/projects");
		await dismissWelcomeModal(page);

		// Navigate to a project
		const projectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		if (await projectCard.isVisible()) {
			await projectCard.click();
			// Wait for navigation to complete
			await page.waitForLoadState("networkidle");
			// Should navigate to clean project URL
			await expect(page).toHaveURL("/project");

			// Verify project page loaded - look for new application button in main content
			await expect(page.locator("main").locator('[data-testid="new-application-button"]')).toBeVisible();

			// Start new application
			const newAppButton = page.locator("main").locator('[data-testid="new-application-button"]');
			if (await newAppButton.isVisible()) {
				await newAppButton.click();
				// Should navigate to wizard
				await expect(page).toHaveURL(/\/wizard/);
			}
		}
	});
});
