import { dismissWelcomeModal } from "./helpers/dismiss-welcome-modal";
import { expect, test } from "./test-setup";

test.describe("Login Journey with Mock Auth", () => {
	test("should bypass login and redirect to dashboard", async ({ page }) => {
		await page.goto("/login");

		await page.waitForURL(/\/(projects|dashboard|wizard)/);

		await dismissWelcomeModal(page);

		const dashboardHeading = page.getByRole("heading", { name: "Dashboard" });
		await expect(dashboardHeading).toBeVisible({ timeout: 10_000 });

		await expect(page.locator('[data-testid="dashboard-main-content"]')).toBeVisible();
	});

	test("should show mock user data on dashboard", async ({ page }) => {
		await page.goto("/projects");

		await dismissWelcomeModal(page);

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

		await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();

		const projectCountText = await page.locator('[data-testid="project-count"]').textContent();
		const projectCount = Number.parseInt(projectCountText ?? "0", 10);
		expect(projectCount).toBeGreaterThanOrEqual(1);

		const appCountText = await page.locator('[data-testid="application-count"]').textContent();
		const appCount = Number.parseInt(appCountText ?? "0", 10);
		expect(appCount).toBeGreaterThanOrEqual(1);

		await expect(page.locator('[data-testid="recent-app-item"]')).toBeVisible();

		await expect(page.locator('[data-testid="dashboard-project-card"]').first()).toBeVisible();
	});

	test("should navigate from login to project wizard", async ({ page }) => {
		await page.goto("/login");

		await expect(page).toHaveURL(/\/projects/);

		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		await page.locator('[data-testid="new-research-project-button"]').click();

		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByRole("heading", { name: "Create Project" })).toBeVisible();
	});

	test("should handle mock WebSocket connection", async ({ page }) => {
		await page.goto("/projects");

		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

		const consoleMessages: string[] = [];
		page.on("console", (msg) => {
			consoleMessages.push(msg.text());
		});

		await page.waitForTimeout(2000);

		const wsMessages = consoleMessages.filter(
			(msg) => msg.includes("Mock WebSocket") || msg.includes("Connection opened"),
		);
		expect(wsMessages.length).toBeGreaterThan(0);
	});

	test("should verify dev bypass is active", async ({ page }) => {
		await page.goto("/projects");

		await expect(page).toHaveURL(/\/projects/);

		await dismissWelcomeModal(page);

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should handle logout gracefully", async ({ page }) => {
		// NOTE: Mock auth logout behavior needs to be implemented properly
		await page.goto("/projects");

		await dismissWelcomeModal(page);

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

		await page.locator('[data-testid="logout-button"]').click();

		await expect(page).toHaveURL(/\/login/);
	});
});

test.describe("Mock API Data Validation", () => {
	test("should display mock project data correctly", async ({ page }) => {
		await page.goto("/projects");

		await dismissWelcomeModal(page);

		await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();

		const projectCards = page.locator('[data-testid="dashboard-project-card"]');

		const count = await projectCards.count();
		expect(count).toBeGreaterThanOrEqual(1);

		await projectCards.first().click();

		await expect(page).toHaveURL("/project");

		await expect(page.locator("main").locator('[data-testid="new-application-button"]')).toBeVisible();
	});

	test("should show mock application data in sidebar", async ({ page }) => {
		await page.goto("/projects");

		await dismissWelcomeModal(page);

		await expect(page.locator('[data-testid="recent-app-item"]')).toBeVisible();

		const statusTexts = ["Generating", "In Progress", "Working Draft"];

		for (const status of statusTexts) {
			await expect(page.getByText(status)).toBeVisible();
		}

		await expect(page.getByText(/Application name 123456/)).toBeVisible();
	});
});
