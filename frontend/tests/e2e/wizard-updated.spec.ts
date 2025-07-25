import { dismissWelcomeModal } from "./helpers/dismiss-welcome-modal";
import { expect, test } from "./test-setup";

test.describe("Application Wizard", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/projects");

		await dismissWelcomeModal(page);

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should complete application details step", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();

		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await expect(titleInput).toBeVisible();
		await titleInput.fill("Test Application Title for E2E Testing");

		const uploadButton = page.locator('[data-testid="upload-files-button"]');
		await expect(uploadButton).toBeVisible();

		const urlInput = page.locator('[data-testid="url-input"]');
		await expect(urlInput).toBeVisible();
		await urlInput.fill("https://example.com/grant-guidelines");

		const continueButton = page.locator('[data-testid="continue-button"]');
		await expect(continueButton).toBeEnabled();
		await continueButton.click();

		await expect(page.locator('[data-testid="application-structure-step"]')).toBeVisible();
	});

	test("should handle application structure step", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard?step=1");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="application-structure-step"]')).toBeVisible();

		const structureSections = page.locator('[data-testid="application-structure-sections"]');
		await expect(structureSections).toBeVisible();

		const addSectionButton = page.locator('[data-testid="add-new-section-button"]');
		if (await addSectionButton.isVisible()) {
			await addSectionButton.click();
		}

		const leftPane = page.locator('[data-testid="application-structure-left-pane"]');
		await expect(leftPane).toBeVisible();

		const previewPane = page.locator('[data-testid="application-structure-preview-pane"]');
		await expect(previewPane).toBeVisible();

		await page.locator('[data-testid="continue-button"]').click();
		await expect(page.locator('[data-testid="knowledge-base-step"]')).toBeVisible();
	});

	test("should handle knowledge base step", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard?step=2");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="knowledge-base-step"]')).toBeVisible();

		const knowledgeBaseContainer = page.locator('[data-testid="knowledge-base-container"]');
		await expect(knowledgeBaseContainer).toBeVisible();

		const filesSection = page.locator('[data-testid="knowledge-base-files"]');
		await expect(filesSection).toBeVisible();

		const urlsSection = page.locator('[data-testid="knowledge-base-urls"]');
		await expect(urlsSection).toBeVisible();

		await page.locator('[data-testid="continue-button"]').click();
		await expect(page.locator('[data-testid="research-plan-step"]')).toBeVisible();
	});

	test("should handle research plan step", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard?step=3");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="research-plan-step"]')).toBeVisible();

		const addObjectiveButton = page.locator('[data-testid="add-objective-button"]');
		await expect(addObjectiveButton).toBeVisible();
		await addObjectiveButton.click();

		const aiTryButton = page.locator('[data-testid="ai-try-button"]');
		await expect(aiTryButton).toBeVisible();
		await aiTryButton.click();

		await page.waitForTimeout(2000);

		await page.locator('[data-testid="continue-button"]').click();
		await expect(page.locator('[data-testid="research-deep-dive-step"]')).toBeVisible();
	});

	test("should handle research deep dive step", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard?step=4");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="research-deep-dive-step"]')).toBeVisible();

		const answerInput = page.locator('[data-testid="research-deep-dive-answer"]');
		if (await answerInput.isVisible()) {
			await answerInput.fill("This is a test answer for the research question");
		}

		const aiTryButton = page.locator('[data-testid="ai-try-button"]');
		await expect(aiTryButton).toBeVisible();
		await aiTryButton.click();

		await page.waitForTimeout(2000);

		await page.locator('[data-testid="continue-button"]').click();
		await expect(page.locator('[data-testid="generate-complete-step"]')).toBeVisible();
	});

	test("should handle generate and complete step", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard?step=5");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="generate-complete-step"]')).toBeVisible();

		const generateButton = page.locator('[data-testid="generate-application-button"]');
		await expect(generateButton).toBeVisible();
		await generateButton.click();

		await page.waitForTimeout(1000);

		await expect(generateButton).toBeDisabled();
	});

	test("should handle wizard navigation", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const stepIndicators = page.locator('[data-testid="step-indicators"]');
		await expect(stepIndicators).toBeVisible();

		const backButton = page.locator('[data-testid="back-button"]');
		await expect(backButton).toBeDisabled();

		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Test Application Title");

		await page.locator('[data-testid="continue-button"]').click();

		await expect(backButton).toBeEnabled();
		await backButton.click();

		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();
	});

	test("should handle exit functionality", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const exitButton = page.locator('[data-testid="exit-button"]');
		await expect(exitButton).toBeVisible();
		await exitButton.click();

		await page.waitForTimeout(1000);
	});

	test("should validate title input", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const continueButton = page.locator('[data-testid="continue-button"]');
		await expect(continueButton).toBeDisabled();

		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Valid Application Title");
		await expect(continueButton).toBeEnabled();

		await titleInput.clear();
		await expect(continueButton).toBeDisabled();
	});

	test("should show step progress correctly", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const activeStep = page.locator('[data-testid="step-active"]');
		await expect(activeStep).toBeVisible();

		const stepTitles = page.locator('[data-testid^="step-title-"]');
		await expect(stepTitles).toHaveCount(6);

		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Test Application Title");
		await page.locator('[data-testid="continue-button"]').click();

		await expect(activeStep).toBeVisible();
	});

	test("should handle file upload interaction", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const uploadButton = page.locator('[data-testid="upload-files-button"]');
		await expect(uploadButton).toBeVisible();
		await uploadButton.click();

		const fileInput = page.locator('[data-testid="file-input"]');
		await expect(fileInput).toBeAttached();
	});

	test("should persist state during navigation", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Persistent Test Title");

		await page.locator('[data-testid="continue-button"]').click();
		await expect(page.locator('[data-testid="application-structure-step"]')).toBeVisible();

		await page.locator('[data-testid="back-button"]').click();
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();

		await expect(titleInput).toHaveValue("Persistent Test Title");
	});

	test("should handle URL input functionality", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const urlInput = page.locator('[data-testid="url-input"]');
		await expect(urlInput).toBeVisible();
		await urlInput.fill("https://example.com/grant-guidelines");

		await expect(urlInput).toHaveValue("https://example.com/grant-guidelines");

		await urlInput.clear();
		await expect(urlInput).toHaveValue("");
	});
});
