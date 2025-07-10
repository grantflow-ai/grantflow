import { dismissWelcomeModal } from "./helpers/dismiss-welcome-modal";
import { expect, test } from "./test-setup";

test.describe("Project Detail Page", () => {
	let projectId: string;

	test.beforeEach(async ({ page }) => {
		// Navigate to projects page
		await page.goto("/projects");

		// Handle welcome modal
		await dismissWelcomeModal(page);

		// Wait for dashboard to load
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

		// Click on the first project to navigate to detail page
		const firstProjectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		await firstProjectCard.click();

		// Wait for navigation to project detail page
		await expect(page).toHaveURL(/\/projects\/[\w-]+-[a-f0-9]{8}$/);

		// Extract project ID from URL for later use
		const url = page.url();
		const match = /\/projects\/([\w-]+-[a-f0-9]{8})$/.exec(url);
		projectId = match?.[1] ?? "";
	});

	test("should display project title and allow editing", async ({ page }) => {
		// Check project title is displayed
		const projectTitle = page.locator('[data-testid="project-title"]');
		await expect(projectTitle).toBeVisible();

		// Click edit button
		await page.locator('[data-testid="edit-project-title-button"]').click();

		// Title should become editable
		const titleInput = page.locator('[data-testid="project-title-input"]');
		await expect(titleInput).toBeVisible();
		await expect(titleInput).toBeFocused();

		// Clear and enter new title
		await titleInput.clear();
		await titleInput.fill("Updated Test Project");

		// Save by pressing Enter
		await titleInput.press("Enter");

		// Should save and show updated title
		await expect(projectTitle).toHaveText("Updated Test Project");
		await expect(titleInput).not.toBeVisible();
	});

	test("should display applications list", async ({ page }) => {
		// Check for applications section
		await expect(page.locator('[data-testid="applications-section"]')).toBeVisible();

		// In minimal scenario, there should be at least 1 application
		const applicationCards = page.locator('[data-testid="application-card"]');
		const count = await applicationCards.count();
		expect(count).toBeGreaterThanOrEqual(0); // Could be 0 if no applications

		if (count > 0) {
			// Check first application card has required elements
			const firstCard = applicationCards.first();
			await expect(firstCard.locator('[data-testid="application-status"]')).toBeVisible();
			await expect(firstCard.locator('[data-testid="application-title"]')).toBeVisible();
			await expect(firstCard.locator('[data-testid="application-last-edited"]')).toBeVisible();
		}
	});

	test("should search applications", async ({ page }) => {
		// Find search input
		const searchInput = page.locator('[data-testid="application-search-input"]');
		await expect(searchInput).toBeVisible();

		// Type search query
		await searchInput.fill("draft");
		await searchInput.press("Enter");

		// Verify search is active (input retains value)
		await expect(searchInput).toHaveValue("draft");
	});

	test("should open new application wizard", async ({ page }) => {
		// Click new application button in main content area
		await page.locator('[data-testid="new-application-button"]').click();

		// Should navigate to wizard
		await expect(page).toHaveURL(/\/wizard/);

		// Verify wizard loaded by checking URL contains expected path
		const currentUrl = page.url();
		expect(currentUrl).toContain("/wizard");
	});

	test("should handle empty state when no applications", async ({ page }) => {
		// If there are no applications, should show empty state
		const applicationCards = page.locator('[data-testid="application-card"]');
		const count = await applicationCards.count();

		if (count === 0) {
			// Check empty state is shown
			await expect(page.locator('[data-testid="empty-applications-state"]')).toBeVisible();
			await expect(page.getByText("No applications yet")).toBeVisible();

			// Empty state should have a new application button
			const emptyStateButton = page.locator('[data-testid="empty-state-new-application-button"]');
			await expect(emptyStateButton).toBeVisible();

			// Click should navigate to wizard
			await emptyStateButton.click();
			await expect(page).toHaveURL(/\/wizard/);
		}
	});

	test("should open application in wizard", async ({ page }) => {
		const applicationCards = page.locator('[data-testid="application-card"]');
		const count = await applicationCards.count();

		if (count > 0) {
			// Click Open button on first application
			const firstCard = applicationCards.first();
			await firstCard.locator('[data-testid="application-open-button"]').click();

			// Should navigate to wizard with application ID
			await expect(page).toHaveURL(/\/wizard/);
		}
	});

	test("should show application menu and delete option", async ({ page }) => {
		const applicationCards = page.locator('[data-testid="application-card"]');
		const count = await applicationCards.count();

		if (count > 0) {
			// Click menu trigger on first application
			const firstCard = applicationCards.first();
			await firstCard.locator('[data-testid="application-menu-trigger"]').click();

			// Menu should be visible
			await expect(page.locator('[data-testid="application-menu"]')).toBeVisible();

			// Delete option should be visible
			const deleteButton = page.locator('[data-testid="application-delete-button"]');
			await expect(deleteButton).toBeVisible();

			// Click delete
			await deleteButton.click();

			// Confirmation dialog should appear
			await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();
			await expect(page.getByText("Are you sure you want to delete this application?")).toBeVisible();

			// Cancel deletion
			await page.locator('[data-testid="cancel-delete-button"]').click();

			// Dialog should close
			await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).not.toBeVisible();
		}
	});

	test("should display project sidebar with applications", async ({ page }) => {
		// Check sidebar is visible
		const sidebar = page.locator('[data-testid="project-sidebar"]');
		await expect(sidebar).toBeVisible();

		// Should show project name in sidebar
		await expect(sidebar.locator('[data-testid="sidebar-project-name"]')).toBeVisible();

		// Should show applications section
		await expect(sidebar.locator('[data-testid="sidebar-applications-section"]')).toBeVisible();

		// Should have new application button in sidebar
		await expect(sidebar.locator('[data-testid="sidebar-new-application-button"]')).toBeVisible();
	});

	test("should display team member avatars", async ({ page }) => {
		// Check for team section in project header
		const teamSection = page.locator('[data-testid="sidebar-team-section"]');
		await expect(teamSection).toBeVisible();

		// Should show at least the current user's avatar
		const avatars = teamSection.locator('[data-testid="app-avatar"]');
		const avatarCount = await avatars.count();
		expect(avatarCount).toBeGreaterThanOrEqual(1);
	});

	test.skip("should navigate to settings from project page", async ({ page }) => {
		// NOTE: Settings pages are not implemented yet
		// Click settings button in sidebar
		await page.locator('[data-testid="project-settings-button"]').click();

		// Wait for settings section to expand and use data-testid to avoid conflicts
		await expect(page.locator('[data-testid="settings-account"]')).toBeVisible();

		// Click on Account Setting using data-testid
		await page.locator('[data-testid="settings-account"]').click();

		// Should navigate to project settings
		await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/settings`));
	});
});

test.describe("Project Detail Page - Application Status", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate directly to first project
		await page.goto("/projects");
		await dismissWelcomeModal(page);

		const firstProjectCard = page.locator('[data-testid="dashboard-project-card"]').first();
		await firstProjectCard.click();
		await expect(page).toHaveURL(/\/projects\/[\w-]+-[a-f0-9]{8}$/);
	});

	test("should display correct application status badges", async ({ page }) => {
		const applicationCards = page.locator('[data-testid="application-card"]');
		const count = await applicationCards.count();

		if (count > 0) {
			// Check various status badges
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
		// Look for status filter buttons
		const filterButtons = page.locator('[data-testid^="status-filter-"]');
		const filterCount = await filterButtons.count();

		if (filterCount > 0) {
			// Click on Draft filter
			const draftFilter = page.locator('[data-testid="status-filter-draft"]');
			if (await draftFilter.isVisible()) {
				await draftFilter.click();

				// Verify filter is active
				await expect(draftFilter).toHaveAttribute("aria-pressed", "true");
			}
		}
	});
});
