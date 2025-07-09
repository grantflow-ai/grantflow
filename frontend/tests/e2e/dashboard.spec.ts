import { dismissWelcomeModal } from "./helpers/dismiss-welcome-modal";
import { expect, test } from "./test-setup";

test.describe("Dashboard with Mock API", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to projects page which renders the dashboard
		await page.goto("/projects");

		// Handle welcome modal
		await dismissWelcomeModal(page);

		// Verify we're on the dashboard
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should display mock projects on dashboard", async ({ page }) => {
		// Check dashboard header elements
		await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
		await expect(page.locator('[data-testid="dashboard-avatar-group"]')).toBeVisible();

		// Check for Research Projects section
		await expect(page.locator('[data-testid="research-projects-heading"]')).toBeVisible();

		// Verify mock project cards are displayed
		const projectCards = page.locator('[data-testid="dashboard-project-card"]');
		await expect(projectCards).toHaveCount(1); // Mock API returns 1 project in minimal scenario

		// Check first project card details - we need to verify what the actual structure is
		const firstCard = projectCards.first();
		await expect(firstCard).toBeVisible();
	});

	test("should open create project modal", async ({ page }) => {
		// Click the New Research Project button
		await page.locator('[data-testid="new-research-project-button"]').click();

		// Verify modal is open
		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByRole("heading", { name: "Create Project" })).toBeVisible();

		// Check form elements
		await expect(page.locator('[data-testid="create-project-name-input"]')).toBeVisible();
		await expect(page.locator('[data-testid="create-project-description-textarea"]')).toBeVisible();
		await expect(page.locator('[data-testid="create-project-submit-button"]')).toBeVisible();
		await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();
	});

	test.skip("should create a new project", async ({ page }) => {
		// Open create project modal
		await page.locator('[data-testid="new-research-project-button"]').click();

		// Fill in project details
		await page.locator('[data-testid="create-project-name-input"]').fill("Test Research Project");
		await page
			.locator('[data-testid="create-project-description-textarea"]')
			.fill("This is a test project for e2e testing");

		// Submit the form
		await page.locator('[data-testid="create-project-submit-button"]').click();

		// Wait for modal to close and navigation
		await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });

		// Should navigate to the new project page
		await expect(page).toHaveURL(/\/projects\/[\w-]+-[a-f0-9]{8}$/);

		// Verify we're on the project page
		await expect(page.getByText("Test Research Project")).toBeVisible({ timeout: 10_000 });
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

		// Should navigate to project detail page with slug format (name-shortid)
		await expect(page).toHaveURL(/\/projects\/[\w-]+-[a-f0-9]{8}$/);

		// Verify project page loaded - look for new application button in main content
		await expect(page.locator("main").locator('[data-testid="new-application-button"]')).toBeVisible();
	});

	test.skip("should show empty state when no projects", async ({ page }) => {
		// Set mock API to use empty scenario
		await page.addInitScript(() => {
			if ((globalThis as any).getMockAPIClient) {
				(globalThis as any).getMockAPIClient().setScenario("empty");
			}
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
		const statsSection = page.locator('[data-testid="dashboard-stats"]');
		await expect(statsSection).toBeVisible();

		// In minimal scenario: 1 project with 1 application
		await expect(page.locator('[data-testid="project-count"]')).toHaveText("1");
		await expect(page.locator('[data-testid="application-count"]')).toHaveText("1");
	});

	test("should show recent applications in sidebar", async ({ page }) => {
		// Check sidebar is visible
		await expect(page.locator('[data-testid="sidebar-logo"]')).toBeVisible();

		// The sidebar shows hardcoded recent applications
		// They are inside a collapsible that may need to be opened
		const recentAppsSection = page.locator('[data-testid="recent-app-item"]');

		// Check if the section is visible (it's in a collapsible defaultOpen)
		await expect(recentAppsSection).toBeVisible();

		// The hardcoded statuses in NavMain component
		await expect(page.getByText("Generating")).toBeVisible();
		await expect(page.getByText("In Progress")).toBeVisible();
		await expect(page.getByText("Working Draft").first()).toBeVisible();
	});
});

test.describe("Project Creation Flow", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/projects");

		// Handle welcome modal
		await dismissWelcomeModal(page);

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test.skip("should validate project creation form", async ({ page }) => {
		// Open create project modal
		await page.locator('[data-testid="new-research-project-button"]').click();

		// Verify submit button is disabled initially
		const submitButton = page.locator('[data-testid="create-project-submit-button"]');
		const nameInput = page.locator('[data-testid="create-project-name-input"]');
		const descriptionTextarea = page.locator('[data-testid="create-project-description-textarea"]');

		await expect(submitButton).toBeDisabled();

		// Fill a short project name (less than 3 characters)
		await nameInput.fill("AB");

		// Should show validation error for short name
		await expect(page.getByText("Project name must be at least 3 characters long")).toBeVisible();
		await expect(submitButton).toBeDisabled();

		// Clear and fill valid project name
		await nameInput.clear();
		await nameInput.fill("Test Project");

		// Submit button should be enabled now (description is optional)
		await expect(submitButton).toBeEnabled();

		// Fill description (optional)
		await descriptionTextarea.fill("Test description");

		// Submit the form
		await submitButton.click();

		// Should close modal
		await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });
	});

	test("should cancel project creation", async ({ page }) => {
		// Open create project modal
		await page.locator('[data-testid="new-research-project-button"]').click();

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

		// Handle welcome modal
		await dismissWelcomeModal(page);

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should navigate using sidebar", async ({ page }) => {
		// First click on a project to enter it
		await page.locator('[data-testid="dashboard-project-card"]').first().click();

		// Should navigate to project page
		await expect(page).toHaveURL(/\/projects\/[\w-]+-[a-f0-9]{8}$/);

		// Now click New Application button on the project page (be more specific)
		await page.locator("main").locator('[data-testid="new-application-button"]').click();

		// Should open application creation flow (wizard)
		await expect(page).toHaveURL(/\/wizard/);
	});

	test.skip("should open settings menu", async ({ page }) => {
		// Click settings trigger to expand the menu
		await page.locator('[data-testid="settings-trigger"]').click();

		// Wait for menu to expand and verify settings menu items
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
