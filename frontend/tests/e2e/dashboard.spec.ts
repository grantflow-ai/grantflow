import { expect, test } from "@playwright/test";

test.describe("Dashboard with Mock API", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to projects page which renders the dashboard
		await page.goto("/projects");

		// Handle welcome modal if it appears
		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		// Verify we're on the dashboard
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should display mock projects on dashboard", async ({ page }) => {
		// Check dashboard header elements
		await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
		await expect(page.locator('[data-testid="dashboard-avatar-group"]')).toBeVisible();
		await expect(page.locator('[data-testid="app-avatar"]').first()).toBeVisible();

		// Check for Research Projects section
		await expect(page.getByText("Research Projects")).toBeVisible();

		// Verify mock project cards are displayed
		const projectCards = page.locator('[data-testid="dashboard-project-card"]');
		await expect(projectCards).toHaveCount(1); // Mock API returns 1 project in minimal scenario

		// Check first project card details
		const firstCard = projectCards.first();
		await expect(firstCard.locator('[data-testid="project-card-title"]')).toContainText("My Research Project");
		await expect(firstCard.locator('[data-testid="project-card-avatar-group"]')).toBeVisible();
	});

	test("should open create project modal", async ({ page }) => {
		// Click the New Research Project button
		await page.getByRole("button", { name: "New Research Project" }).click();

		// Verify modal is open
		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByRole("heading", { name: "Create Project" })).toBeVisible();

		// Check form elements
		await expect(page.locator('[data-testid="create-project-name-input"]')).toBeVisible();
		await expect(page.locator('[data-testid="create-project-description-textarea"]')).toBeVisible();
		await expect(page.locator('[data-testid="create-project-submit-button"]')).toBeVisible();
		await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();
	});

	test("should create a new project", async ({ page }) => {
		// Open create project modal
		await page.getByRole("button", { name: "New Research Project" }).click();

		// Fill in project details
		await page.locator('[data-testid="create-project-name-input"]').fill("Test Research Project");
		await page
			.locator('[data-testid="create-project-description-textarea"]')
			.fill("This is a test project for e2e testing");

		// Submit the form
		await page.locator('[data-testid="create-project-submit-button"]').click();

		// Wait for modal to close and navigation
		await expect(page.getByRole("dialog")).not.toBeVisible();

		// Should navigate to the new project page
		await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);

		// Verify we're on the project page
		await expect(page.getByText("Test Research Project")).toBeVisible();
	});

	test("should handle project card interactions", async ({ page }) => {
		const firstCard = page.locator('[data-testid="dashboard-project-card"]').first();

		// Test hover state
		await firstCard.hover();

		// Open project menu
		await firstCard.locator('[data-testid="project-card-menu-trigger"]').click();

		// Verify menu options
		await expect(page.locator('[data-testid="project-card-menu"]')).toBeVisible();
		await expect(page.locator('[data-testid="project-card-delete"]')).toBeVisible();
		await expect(page.locator('[data-testid="project-card-duplicate"]')).toBeVisible();
	});

	test("should navigate to project detail on card click", async ({ page }) => {
		// Click on the first project card
		await page.locator('[data-testid="dashboard-project-card"]').first().click();

		// Should navigate to project detail page
		await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);

		// Verify project page loaded
		await expect(page.getByText("Applications")).toBeVisible();
	});

	test("should show empty state when no projects", async ({ page }) => {
		// Mock empty projects response
		await page.route("/api/projects", async (route) => {
			await route.fulfill({ json: [] });
		});

		// Reload the page
		await page.reload();

		// Check empty state
		await expect(page.locator('[data-testid="empty-projects-state"]')).toBeVisible();
		await expect(page.getByText("You don't have any projects yet.")).toBeVisible();
		await expect(page.locator('[data-testid="create-first-project-button"]')).toBeVisible();
	});

	test("should display dashboard statistics", async ({ page }) => {
		// Check for stats section
		await expect(page.getByText("Research projects")).toBeVisible();
		await expect(page.getByText("2")).toBeVisible(); // Mock returns 2 projects

		await expect(page.getByText("Applications")).toBeVisible();
		await expect(page.getByText("5")).toBeVisible(); // Mock returns 5 applications

		await expect(page.getByText("Active Drafts")).toBeVisible();
		await expect(page.getByText("3")).toBeVisible(); // Mock returns 3 active drafts
	});

	test("should show recent applications in sidebar", async ({ page }) => {
		// Check sidebar is visible
		await expect(page.locator('[data-testid="sidebar-logo"]')).toBeVisible();

		// Check recent applications section
		await expect(page.getByText("Recent Applications")).toBeVisible();

		// Verify mock recent applications are shown
		const recentApps = page.locator('[data-testid="recent-app-item"]');
		await expect(recentApps.count()).resolves.toBeGreaterThan(0);

		// Check application statuses
		await expect(page.getByText("Generating")).toBeVisible();
		await expect(page.getByText("In Progress")).toBeVisible();
		await expect(page.getByText("Working Draft")).toBeVisible();
	});
});

test.describe("Project Creation Flow", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/projects");

		// Handle welcome modal if it appears
		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should validate project creation form", async ({ page }) => {
		// Open create project modal
		await page.getByRole("button", { name: "New Research Project" }).click();

		// Try to submit empty form
		await page.locator('[data-testid="create-project-submit-button"]').click();

		// Should show validation errors
		await expect(page.getByText("Please provide a project name")).toBeVisible();

		// Fill only name
		await page.locator('[data-testid="create-project-name-input"]').fill("Test");
		await page.locator('[data-testid="create-project-submit-button"]').click();

		// Should still show description error
		await expect(page.getByText("Please provide a project description")).toBeVisible();

		// Fill description
		await page.locator('[data-testid="create-project-description-textarea"]').fill("Test description");

		// Should now be able to submit
		await page.locator('[data-testid="create-project-submit-button"]').click();
		await expect(page.getByRole("dialog")).not.toBeVisible();
	});

	test("should cancel project creation", async ({ page }) => {
		// Open create project modal
		await page.getByRole("button", { name: "New Research Project" }).click();

		// Fill in some data
		await page.locator('[data-testid="create-project-name-input"]').fill("Test Project");

		// Click cancel
		await page.locator('[data-testid="cancel-button"]').click();

		// Modal should close
		await expect(page.getByRole("dialog")).not.toBeVisible();

		// Should still be on dashboard
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});
});

test.describe("Dashboard Navigation", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/projects");

		// Handle welcome modal if it appears
		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should navigate using sidebar", async ({ page }) => {
		// Click New Application button
		await page.locator('[data-testid="new-application-button"]').click();

		// Should open application creation flow
		await expect(page).toHaveURL(/\/wizard/);
	});

	test("should open settings menu", async ({ page }) => {
		// Click settings trigger
		await page.locator('[data-testid="settings-trigger"]').click();

		// Verify settings menu items
		await expect(page.locator('[data-testid="settings-account"]')).toBeVisible();
		await expect(page.locator('[data-testid="settings-billing"]')).toBeVisible();
		await expect(page.locator('[data-testid="settings-members"]')).toBeVisible();
		await expect(page.locator('[data-testid="settings-notifications"]')).toBeVisible();
	});

	test("should search applications", async ({ page }) => {
		// Type in search input
		await page.locator('[data-testid="search-input"]').fill("climate");

		// Should filter applications (mock behavior)
		await page.keyboard.press("Enter");

		// Verify search is active
		await expect(page.locator('[data-testid="search-input"]')).toHaveValue("climate");
	});
});
