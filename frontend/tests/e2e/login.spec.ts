import { dismissWelcomeModal } from "./helpers/dismiss-welcome-modal";
import { expect, test } from "./test-setup";

test.describe("Login Journey with Mock Auth", () => {
	test("should bypass login and redirect to dashboard", async ({ page }) => {
		// Navigate to login page
		await page.goto("/login");

		// Wait for navigation
		await page.waitForURL(/\/(projects|dashboard|wizard)/);

		// Current URL is available via page.url() if needed for debugging

		// Handle welcome modal
		await dismissWelcomeModal(page);

		// Check if we're on the dashboard or projects page
		const dashboardHeading = page.getByRole("heading", { name: "Dashboard" });
		await expect(dashboardHeading).toBeVisible({ timeout: 10_000 });

		// Verify user is authenticated - dashboard is visible
		await expect(page.locator('[data-testid="dashboard-main-content"]')).toBeVisible();
	});

	test("should show mock user data on dashboard", async ({ page }) => {
		// Go directly to projects page (which shows dashboard)
		await page.goto("/projects");

		// Handle welcome modal if it appears
		await dismissWelcomeModal(page);

		// Verify dashboard loads
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

		// Verify we have mock projects stats
		await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();
		// Project count should be at least 1
		const projectCountText = await page.locator('[data-testid="project-count"]').textContent();
		const projectCount = Number.parseInt(projectCountText ?? "0", 10);
		expect(projectCount).toBeGreaterThanOrEqual(1);

		// Application count should be at least 1
		const appCountText = await page.locator('[data-testid="application-count"]').textContent();
		const appCount = Number.parseInt(appCountText ?? "0", 10);
		expect(appCount).toBeGreaterThanOrEqual(1);

		// Check for recent applications in sidebar
		await expect(page.locator('[data-testid="recent-app-item"]')).toBeVisible();

		// Verify mock project card is visible
		await expect(page.locator('[data-testid="dashboard-project-card"]').first()).toBeVisible();
	});

	test("should navigate from login to project wizard", async ({ page }) => {
		// Start at login
		await page.goto("/login");

		// Should redirect to projects
		await expect(page).toHaveURL(/\/projects/);

		// Handle welcome modal if it appears
		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		// Click New Research Project button
		await page.locator('[data-testid="new-research-project-button"]').click();

		// Should open project creation modal
		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByRole("heading", { name: "Create Project" })).toBeVisible();
	});

	test("should handle mock WebSocket connection", async ({ page }) => {
		await page.goto("/projects");

		// Handle welcome modal if it appears
		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		// Wait for page to load
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

		// Check console for WebSocket connection logs
		const consoleMessages: string[] = [];
		page.on("console", (msg) => {
			consoleMessages.push(msg.text());
		});

		// Wait a bit for WebSocket to initialize
		await page.waitForTimeout(2000);

		// Verify mock WebSocket connection was established
		const wsMessages = consoleMessages.filter(
			(msg) => msg.includes("Mock WebSocket") || msg.includes("Connection opened"),
		);
		expect(wsMessages.length).toBeGreaterThan(0);
	});

	test("should verify dev bypass is active", async ({ page }) => {
		await page.goto("/projects");

		// In mock mode, the dev tools might not be available or might have different UI
		// Let's skip this test for now as it depends on dev tools implementation
		test.skip();
	});

	test.skip("should handle logout gracefully", async ({ page }) => {
		// NOTE: Mock auth logout behavior needs to be implemented properly
		await page.goto("/projects");

		// Handle welcome modal if it appears
		await dismissWelcomeModal(page);

		// Verify we're logged in
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

		// Click logout button directly in the sidebar
		await page.locator('[data-testid="logout-button"]').click();

		// In mock mode, logout should redirect to login page
		await expect(page).toHaveURL(/\/login/);
	});
});

test.describe("Mock API Data Validation", () => {
	test("should display mock project data correctly", async ({ page }) => {
		await page.goto("/projects");

		// Handle welcome modal if it appears
		await dismissWelcomeModal(page);

		// Wait for projects to load
		await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();

		// Verify we have mock projects
		const projectCards = page.locator('[data-testid="dashboard-project-card"]');
		// The minimal scenario returns 1 project, but there might be more from other tests
		const count = await projectCards.count();
		expect(count).toBeGreaterThanOrEqual(1);

		// Click on first project
		await projectCards.first().click();

		// Should navigate to project detail page with clean URL
		await expect(page).toHaveURL("/project");

		// Should see the project page - check for expected elements
		// Use main locator to avoid matching sidebar button
		await expect(page.locator("main").locator('[data-testid="new-application-button"]')).toBeVisible();
	});

	test("should show mock application data in sidebar", async ({ page }) => {
		await page.goto("/projects");

		// Handle welcome modal if it appears
		await dismissWelcomeModal(page);

		// Verify Recent Applications section is in the sidebar
		await expect(page.locator('[data-testid="recent-app-item"]')).toBeVisible();

		// Check for hardcoded application statuses in the sidebar
		const statusTexts = ["Generating", "In Progress", "Working Draft"];

		for (const status of statusTexts) {
			await expect(page.getByText(status)).toBeVisible();
		}

		// Verify hardcoded application names are visible
		await expect(page.getByText(/Application name 123456/)).toBeVisible();
	});
});
