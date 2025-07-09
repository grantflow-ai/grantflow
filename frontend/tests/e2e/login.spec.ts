import { expect, test } from "@playwright/test";

test.describe("Login Journey with Mock Auth", () => {
	test("should bypass login and redirect to dashboard", async ({ page }) => {
		// Navigate to login page
		await page.goto("/login");

		// Wait for navigation
		await page.waitForURL(/\/(projects|dashboard|wizard)/);

		// Current URL is available via page.url() if needed for debugging

		// Handle welcome modal if it appears
		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await laterButton.click();
			// Wait for modal to close
			await page.waitForTimeout(500);
		}

		// Check if we're on the dashboard or projects page
		const dashboardHeading = page.getByRole("heading", { name: "Dashboard" });
		await expect(dashboardHeading).toBeVisible({ timeout: 10_000 });

		// Verify user is authenticated (check for user avatar/initials)
		await expect(page.locator('[data-testid="app-avatar"]').first()).toBeVisible();
	});

	test("should show mock user data on dashboard", async ({ page }) => {
		// Go directly to projects page (which shows dashboard)
		await page.goto("/projects");

		// Verify dashboard loads
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

		// Verify we have mock projects
		await expect(page.getByText("Research projects")).toBeVisible();
		await expect(page.getByText("Applications")).toBeVisible();

		// Check for recent applications in sidebar
		await expect(page.getByText("Recent Applications")).toBeVisible();

		// Verify mock project cards are visible
		await expect(page.locator('[data-testid="dashboard-project-card"]').first()).toBeVisible();
	});

	test("should navigate from login to project wizard", async ({ page }) => {
		// Start at login
		await page.goto("/login");

		// Should redirect to projects
		await expect(page).toHaveURL(/\/projects/);

		// Click New Research Project button
		await page.getByRole("button", { name: "New Research Project" }).first().click();

		// Should be in the wizard
		await expect(page).toHaveURL(/\/wizard/);

		// Verify wizard step 1 is active
		await expect(page.getByText("Application Details")).toBeVisible();
		await expect(page.getByText("Application Title")).toBeVisible();
	});

	test("should handle mock WebSocket connection", async ({ page }) => {
		await page.goto("/projects");

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

		// Open dev menu with keyboard shortcut
		await page.keyboard.press("Meta+Shift+D");

		// Wait for dev tools to appear
		await expect(page.getByText("Developer Tools")).toBeVisible();

		// Verify Mock API is active
		await expect(page.getByText("Mock API Active")).toBeVisible();

		// Check API configuration
		await expect(page.getByText("Mock API Mode")).toBeVisible();
	});

	test("should handle logout gracefully", async ({ page }) => {
		await page.goto("/projects");

		// Verify we're logged in
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

		// Click logout button
		await page.getByRole("button", { name: "Logout" }).click();

		// Should redirect to login or home page
		// Note: In mock mode, this might behave differently
		await expect(page).toHaveURL(/\/(login|$)/);
	});
});

test.describe("Mock API Data Validation", () => {
	test("should display mock project data correctly", async ({ page }) => {
		await page.goto("/projects");

		// Wait for projects to load
		await expect(page.getByText("Research projects")).toBeVisible();

		// Verify we have mock projects
		const projectCards = page.locator('[data-testid="dashboard-project-card"]');
		await expect(projectCards).toHaveCount(1);

		// Click on first project
		await projectCards.first().click();

		// Should navigate to project detail page
		await expect(page).toHaveURL(/\/projects\/[^/]+$/);

		// Verify project detail loads
		await expect(page.getByText("No applications yet").or(page.getByText("Applications"))).toBeVisible();
	});

	test("should show mock application data in sidebar", async ({ page }) => {
		await page.goto("/projects");

		// Verify Recent Applications section
		await expect(page.getByText("Recent Applications")).toBeVisible();

		// Check for mock application statuses
		const statusTexts = ["Generating", "In Progress", "Working Draft"];

		for (const status of statusTexts) {
			await expect(page.getByText(status)).toBeVisible();
		}

		// Verify application names are visible
		await expect(page.getByText(/Application name \d+/)).toBeVisible();
	});
});
