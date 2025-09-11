import { dismissWelcomeModal } from "./helpers/dismiss-welcome-modal";
import { expect, test } from "./test-setup";

test.describe("Dashboard with Mock API", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/projects");

		await dismissWelcomeModal(page);

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should display mock projects on dashboard", async ({ page }) => {
		await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
		await expect(page.locator('[data-testid="dashboard-avatar-group"]')).toBeVisible();

		await expect(page.locator('[data-testid="research-projects-heading"]')).toBeVisible();

		const projectCards = page.locator('[data-testid="dashboard-project-card"]');
		const count = await projectCards.count();
		expect(count).toBeGreaterThanOrEqual(1);

		const firstCard = projectCards.first();
		await expect(firstCard).toBeVisible();
	});

	test("should open create project modal", async ({ page }) => {
		await page.locator('[data-testid="new-research-project-button"]').click();

		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByRole("heading", { name: "Create Project" })).toBeVisible();

		await expect(page.locator('[data-testid="create-project-name-input"]')).toBeVisible();
		await expect(page.locator('[data-testid="create-project-description-textarea"]')).toBeVisible();
		await expect(page.locator('[data-testid="create-project-submit-button"]')).toBeVisible();
		await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();
	});

	test("should create a new project", async ({ page }) => {
		await page.locator('[data-testid="new-research-project-button"]').click();

		await page.locator('[data-testid="create-project-name-input"]').fill("Test Research Project");
		await page
			.locator('[data-testid="create-project-description-textarea"]')
			.fill("This is a test project for e2e testing");

		await page.locator('[data-testid="create-project-submit-button"]').click();

		await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });

		await expect(page).toHaveURL("/project");

		await expect(page.getByText("Test Research Project")).toBeVisible({ timeout: 10_000 });
	});

	test("should handle project card interactions", async ({ page }) => {
		const firstCard = page.locator('[data-testid="dashboard-project-card"]').first();

		await firstCard.hover();

		await firstCard.locator('[data-testid="project-card-menu-trigger"]').click();

		await expect(page.locator('[data-testid="project-card-menu"]')).toBeVisible();
		await expect(page.locator('[data-testid="project-card-delete"]')).toBeVisible();
		await expect(page.locator('[data-testid="project-card-duplicate"]')).toBeVisible();
	});

	test("should navigate to project detail on card click", async ({ page }) => {
		await page.locator('[data-testid="dashboard-project-card"]').first().click();

		await expect(page).toHaveURL("/project");

		await expect(page.locator("main").locator('[data-testid="new-application-button"]')).toBeVisible();
	});

	test("should show empty state when no projects", async ({ page }) => {
		await page.addInitScript(() => {
			if ((globalThis as any).getMockAPIClient) {
				(globalThis as any).getMockAPIClient().setScenario("empty");
			}
		});

		await page.reload();

		await expect(page.locator('[data-testid="empty-projects-state"]')).toBeVisible();
		await expect(page.getByText("You don't have any projects yet.")).toBeVisible();
		await expect(page.locator('[data-testid="create-first-project-button"]')).toBeVisible();
	});

	test("should display dashboard statistics", async ({ page }) => {
		const statsSection = page.locator('[data-testid="dashboard-stats"]');
		await expect(statsSection).toBeVisible();

		const projectCountText = await page.locator('[data-testid="project-count"]').textContent();
		const projectCount = Number.parseInt(projectCountText ?? "0", 10);
		expect(projectCount).toBeGreaterThanOrEqual(1);

		const appCountText = await page.locator('[data-testid="application-count"]').textContent();
		const appCount = Number.parseInt(appCountText ?? "0", 10);
		expect(appCount).toBeGreaterThanOrEqual(1);
	});

	test("should show recent applications in sidebar", async ({ page }) => {
		await expect(page.locator('[data-testid="sidebar-logo"]')).toBeVisible();

		const recentAppsSection = page.locator('[data-testid="recent-app-item"]');

		await expect(recentAppsSection).toBeVisible();

		await expect(page.getByText("Generating")).toBeVisible();
		await expect(page.getByText("In Progress")).toBeVisible();
		await expect(page.getByText("Working Draft").first()).toBeVisible();
	});
});

test.describe("Project Creation Flow", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/projects");

		await dismissWelcomeModal(page);

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should validate project creation form", async ({ page }) => {
		await page.locator('[data-testid="new-research-project-button"]').click();

		const submitButton = page.locator('[data-testid="create-project-submit-button"]');
		const nameInput = page.locator('[data-testid="create-project-name-input"]');
		const descriptionTextarea = page.locator('[data-testid="create-project-description-textarea"]');

		await expect(submitButton).toBeDisabled();

		await nameInput.fill("AB");

		await expect(page.getByText("Project name must be at least 3 characters long")).toBeVisible();
		await expect(submitButton).toBeDisabled();

		await nameInput.clear();
		await nameInput.fill("Test Project");

		await expect(submitButton).toBeEnabled();

		await descriptionTextarea.fill("Test description");

		await submitButton.click();

		await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });
	});

	test("should cancel project creation", async ({ page }) => {
		await page.locator('[data-testid="new-research-project-button"]').click();

		await page.locator('[data-testid="create-project-name-input"]').fill("Test Project");

		await page.locator('[data-testid="cancel-button"]').click();

		await expect(page.getByRole("dialog")).not.toBeVisible();

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});
});

test.describe("Dashboard Navigation", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/projects");

		await dismissWelcomeModal(page);

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should navigate using sidebar", async ({ page }) => {
		await page.locator('[data-testid="dashboard-project-card"]').first().click();

		await expect(page).toHaveURL("/project");

		await page.locator("main").locator('[data-testid="new-application-button"]').click();

		await expect(page).toHaveURL(/\/wizard/);
	});

	test("should open settings menu", async ({ page }) => {
		await page.locator('[data-testid="settings-trigger"]').click();

		await expect(page.locator('[data-testid="settings-account"]')).toBeVisible();
		await expect(page.locator('[data-testid="settings-billing"]')).toBeVisible();
		await expect(page.locator('[data-testid="settings-members"]')).toBeVisible();
		await expect(page.locator('[data-testid="settings-notifications"]')).toBeVisible();
	});

	test("should search applications", async ({ page }) => {
		await page.locator('[data-testid="search-input"]').fill("climate");

		await page.keyboard.press("Enter");

		await expect(page.locator('[data-testid="search-input"]')).toHaveValue("climate");
	});
});
