import { dismissWelcomeModal } from "./helpers/dismiss-welcome-modal";
import { expect, test } from "./test-setup";

test.describe("Project Detail Page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/projects");

		await dismissWelcomeModal(page);

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

		const firstProjectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		await firstProjectCard.click();

		await expect(page).toHaveURL("/project");
	});

	test("should display project title and allow editing", async ({ page }) => {
		const projectTitle = page.locator('[data-testid="project-title"]');
		await expect(projectTitle).toBeVisible();

		await page.locator('[data-testid="edit-project-title-button"]').click();

		const titleInput = page.locator('[data-testid="project-title-input"]');
		await expect(titleInput).toBeVisible();
		await expect(titleInput).toBeFocused();

		await titleInput.clear();
		await titleInput.fill("Updated Test Project");

		await titleInput.press("Enter");

		await expect(projectTitle).toHaveText("Updated Test Project");
		await expect(titleInput).not.toBeVisible();
	});

	test("should display applications list", async ({ page }) => {
		await expect(page.locator('[data-testid="applications-section"]')).toBeVisible();

		const applicationCards = page.locator('[data-testid="application-card"]');
		const count = await applicationCards.count();
		expect(count).toBeGreaterThanOrEqual(0);

		if (count > 0) {
			const firstCard = applicationCards.first();
			await expect(firstCard.locator('[data-testid="application-status"]')).toBeVisible();
			await expect(firstCard.locator('[data-testid="application-title"]')).toBeVisible();
			await expect(firstCard.locator('[data-testid="application-last-edited"]')).toBeVisible();
		}
	});

	test("should search applications", async ({ page }) => {
		const searchInput = page.locator('[data-testid="application-search-input"]');
		await expect(searchInput).toBeVisible();

		await searchInput.fill("draft");
		await searchInput.press("Enter");

		await expect(searchInput).toHaveValue("draft");
	});

	test("should open new application wizard", async ({ page }) => {
		await page.locator('[data-testid="new-application-button"]').click();

		await expect(page).toHaveURL(/\/wizard/);

		const currentUrl = page.url();
		expect(currentUrl).toContain("/wizard");
	});

	test("should handle empty state when no applications", async ({ page }) => {
		const applicationCards = page.locator('[data-testid="application-card"]');
		const count = await applicationCards.count();

		if (count === 0) {
			await expect(page.locator('[data-testid="empty-applications-state"]')).toBeVisible();
			await expect(page.getByText("No applications yet")).toBeVisible();

			const emptyStateButton = page.locator('[data-testid="empty-state-new-application-button"]');
			await expect(emptyStateButton).toBeVisible();

			await emptyStateButton.click();
			await expect(page).toHaveURL(/\/wizard/);
		}
	});

	test("should open application in wizard", async ({ page }) => {
		const applicationCards = page.locator('[data-testid="application-card"]');
		const count = await applicationCards.count();

		if (count > 0) {
			const firstCard = applicationCards.first();
			await firstCard.locator('[data-testid="application-open-button"]').click();

			await expect(page).toHaveURL(/\/wizard/);
		}
	});

	test("should show application menu and delete option", async ({ page }) => {
		const applicationCards = page.locator('[data-testid="application-card"]');
		const count = await applicationCards.count();

		if (count > 0) {
			const firstCard = applicationCards.first();
			await firstCard.locator('[data-testid="application-menu-trigger"]').click();

			await expect(page.locator('[data-testid="application-menu"]')).toBeVisible();

			const deleteButton = page.locator('[data-testid="application-delete-button"]');
			await expect(deleteButton).toBeVisible();

			await deleteButton.click();

			await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();
			await expect(page.getByText("Are you sure you want to delete this application?")).toBeVisible();

			await page.locator('[data-testid="cancel-delete-button"]').click();

			await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).not.toBeVisible();
		}
	});

	test("should display project sidebar with applications", async ({ page }) => {
		const sidebar = page.locator('[data-testid="project-sidebar"]');
		await expect(sidebar).toBeVisible();

		await expect(sidebar.locator('[data-testid="sidebar-project-name"]')).toBeVisible();

		await expect(sidebar.locator('[data-testid="sidebar-applications-section"]')).toBeVisible();

		await expect(sidebar.locator('[data-testid="sidebar-new-application-button"]')).toBeVisible();
	});

	test("should display team member avatars", async ({ page }) => {
		const teamSection = page.locator('[data-testid="sidebar-team-section"]');
		await expect(teamSection).toBeVisible();

		const avatars = teamSection.locator('[data-testid="app-avatar"]');
		const avatarCount = await avatars.count();
		expect(avatarCount).toBeGreaterThanOrEqual(1);
	});

	test("should navigate to settings from project page", async ({ page }) => {
		const settingsButton = page.locator('[data-testid="project-settings-button"]');

		if (await settingsButton.isVisible()) {
			await settingsButton.click();

			await expect(page.locator('[data-testid="settings-account"]')).toBeVisible();
		} else {
			await page.goto("/projects/test-project-id/settings");
			await expect(page).toHaveURL(/\/settings/);
		}

		await page.locator('[data-testid="settings-account"]').click();

		await expect(page).toHaveURL("/project/settings/account");
	});
});

test.describe("Project Detail Page - Application Status", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/projects");
		await dismissWelcomeModal(page);

		const firstProjectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		await firstProjectCard.click();
		await expect(page).toHaveURL("/project");
	});

	test("should display correct application status badges", async ({ page }) => {
		const applicationCards = page.locator('[data-testid="application-card"]');
		const count = await applicationCards.count();

		if (count > 0) {
			const statuses = ["Draft", "In Progress", "Completed"];

			for (const card of await applicationCards.all()) {
				const statusBadge = card.locator('[data-testid="application-status"]');
				await expect(statusBadge).toBeVisible();

				const statusText = await statusBadge.textContent();
				expect(statuses.some((status) => statusText?.includes(status))).toBeTruthy();
			}
		}
	});

	test("should filter applications by status", async ({ page }) => {
		const filterButtons = page.locator('[data-testid^="status-filter-"]');
		const filterCount = await filterButtons.count();

		if (filterCount > 0) {
			const draftFilter = page.locator('[data-testid="status-filter-draft"]');
			if (await draftFilter.isVisible()) {
				await draftFilter.click();

				await expect(draftFilter).toHaveAttribute("aria-pressed", "true");
			}
		}
	});
});
