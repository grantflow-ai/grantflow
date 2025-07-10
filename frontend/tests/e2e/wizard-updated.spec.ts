import { dismissWelcomeModal } from "./helpers/dismiss-welcome-modal";
import { expect, test } from "./test-setup";

test.describe("Application Wizard", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to projects page
		await page.goto("/projects");

		// Handle welcome modal
		await dismissWelcomeModal(page);

		// Wait for dashboard to load
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should complete application details step", async ({ page }) => {
		// Navigate directly to wizard using a known project ID
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Verify we're on the first step
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();

		// Test title input
		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await expect(titleInput).toBeVisible();
		await titleInput.fill("Test Application Title for E2E Testing");

		// Test file upload section
		const uploadButton = page.locator('[data-testid="upload-files-button"]');
		await expect(uploadButton).toBeVisible();

		// Test URL input
		const urlInput = page.locator('[data-testid="url-input"]');
		await expect(urlInput).toBeVisible();
		await urlInput.fill("https://example.com/grant-guidelines");

		// Test continue button becomes enabled after title input
		const continueButton = page.locator('[data-testid="continue-button"]');
		await expect(continueButton).toBeEnabled();
		await continueButton.click();

		// Should navigate to next step
		await expect(page.locator('[data-testid="application-structure-step"]')).toBeVisible();
	});

	test("should handle application structure step", async ({ page }) => {
		// Navigate to structure step
		await page.goto("/projects/1/applications/1/wizard?step=1");
		await page.waitForLoadState("networkidle");

		// Verify we're on the structure step
		await expect(page.locator('[data-testid="application-structure-step"]')).toBeVisible();

		// Test structure sections container
		const structureSections = page.locator('[data-testid="application-structure-sections"]');
		await expect(structureSections).toBeVisible();

		// Test add new section button
		const addSectionButton = page.locator('[data-testid="add-new-section-button"]');
		if (await addSectionButton.isVisible()) {
			await addSectionButton.click();
		}

		// Test left pane elements
		const leftPane = page.locator('[data-testid="application-structure-left-pane"]');
		await expect(leftPane).toBeVisible();

		// Test preview pane
		const previewPane = page.locator('[data-testid="application-structure-preview-pane"]');
		await expect(previewPane).toBeVisible();

		// Continue to next step
		await page.locator('[data-testid="continue-button"]').click();
		await expect(page.locator('[data-testid="knowledge-base-step"]')).toBeVisible();
	});

	test("should handle knowledge base step", async ({ page }) => {
		// Navigate to knowledge base step
		await page.goto("/projects/1/applications/1/wizard?step=2");
		await page.waitForLoadState("networkidle");

		// Verify we're on the knowledge base step
		await expect(page.locator('[data-testid="knowledge-base-step"]')).toBeVisible();

		// Test knowledge base container
		const knowledgeBaseContainer = page.locator('[data-testid="knowledge-base-container"]');
		await expect(knowledgeBaseContainer).toBeVisible();

		// Test files section
		const filesSection = page.locator('[data-testid="knowledge-base-files"]');
		await expect(filesSection).toBeVisible();

		// Test URLs section
		const urlsSection = page.locator('[data-testid="knowledge-base-urls"]');
		await expect(urlsSection).toBeVisible();

		// Continue to next step
		await page.locator('[data-testid="continue-button"]').click();
		await expect(page.locator('[data-testid="research-plan-step"]')).toBeVisible();
	});

	test("should handle research plan step", async ({ page }) => {
		// Navigate to research plan step
		await page.goto("/projects/1/applications/1/wizard?step=3");
		await page.waitForLoadState("networkidle");

		// Verify we're on the research plan step
		await expect(page.locator('[data-testid="research-plan-step"]')).toBeVisible();

		// Test add objective button
		const addObjectiveButton = page.locator('[data-testid="add-objective-button"]');
		await expect(addObjectiveButton).toBeVisible();
		await addObjectiveButton.click();

		// Test AI autofill button
		const aiTryButton = page.locator('[data-testid="ai-try-button"]');
		await expect(aiTryButton).toBeVisible();
		await aiTryButton.click();

		// Wait for autofill to complete (mock scenario)
		await page.waitForTimeout(2000);

		// Continue to next step
		await page.locator('[data-testid="continue-button"]').click();
		await expect(page.locator('[data-testid="research-deep-dive-step"]')).toBeVisible();
	});

	test("should handle research deep dive step", async ({ page }) => {
		// Navigate to research deep dive step
		await page.goto("/projects/1/applications/1/wizard?step=4");
		await page.waitForLoadState("networkidle");

		// Verify we're on the research deep dive step
		await expect(page.locator('[data-testid="research-deep-dive-step"]')).toBeVisible();

		// Test answer textarea
		const answerInput = page.locator('[data-testid="research-deep-dive-answer"]');
		if (await answerInput.isVisible()) {
			await answerInput.fill("This is a test answer for the research question");
		}

		// Test AI autofill button
		const aiTryButton = page.locator('[data-testid="ai-try-button"]');
		await expect(aiTryButton).toBeVisible();
		await aiTryButton.click();

		// Wait for autofill to complete (mock scenario)
		await page.waitForTimeout(2000);

		// Continue to final step
		await page.locator('[data-testid="continue-button"]').click();
		await expect(page.locator('[data-testid="generate-complete-step"]')).toBeVisible();
	});

	test("should handle generate and complete step", async ({ page }) => {
		// Navigate to generate and complete step
		await page.goto("/projects/1/applications/1/wizard?step=5");
		await page.waitForLoadState("networkidle");

		// Verify we're on the generate and complete step
		await expect(page.locator('[data-testid="generate-complete-step"]')).toBeVisible();

		// Test generate application button
		const generateButton = page.locator('[data-testid="generate-application-button"]');
		await expect(generateButton).toBeVisible();
		await generateButton.click();

		// Wait for generation to start (mock scenario)
		await page.waitForTimeout(1000);

		// The button should be disabled during generation
		await expect(generateButton).toBeDisabled();
	});

	test("should handle wizard navigation", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test step indicators
		const stepIndicators = page.locator('[data-testid="step-indicators"]');
		await expect(stepIndicators).toBeVisible();

		// Test back button (should be disabled on first step)
		const backButton = page.locator('[data-testid="back-button"]');
		await expect(backButton).toBeDisabled();

		// Add title to enable continue button
		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Test Application Title");

		// Navigate to next step
		await page.locator('[data-testid="continue-button"]').click();

		// Test back button (should be enabled on second step)
		await expect(backButton).toBeEnabled();
		await backButton.click();

		// Should be back on first step
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();
	});

	test("should handle exit functionality", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test exit button
		const exitButton = page.locator('[data-testid="exit-button"]');
		await expect(exitButton).toBeVisible();
		await exitButton.click();

		// Should navigate away from wizard (or show confirmation)
		// The exact behavior depends on implementation
		await page.waitForTimeout(1000);
	});

	test("should validate title input", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test empty title - continue button should be disabled
		const continueButton = page.locator('[data-testid="continue-button"]');
		await expect(continueButton).toBeDisabled();

		// Test valid title - continue button should be enabled
		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Valid Application Title");
		await expect(continueButton).toBeEnabled();

		// Test clearing title - continue button should be disabled again
		await titleInput.clear();
		await expect(continueButton).toBeDisabled();
	});

	test("should show step progress correctly", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test that first step is active
		const activeStep = page.locator('[data-testid="step-active"]');
		await expect(activeStep).toBeVisible();

		// Test step titles are visible
		const stepTitles = page.locator('[data-testid^="step-title-"]');
		await expect(stepTitles).toHaveCount(6);

		// Navigate to next step and check progress
		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Test Application Title");
		await page.locator('[data-testid="continue-button"]').click();

		// Should still have active step indicator
		await expect(activeStep).toBeVisible();
	});

	test("should handle file upload interaction", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test file upload button
		const uploadButton = page.locator('[data-testid="upload-files-button"]');
		await expect(uploadButton).toBeVisible();
		await uploadButton.click();

		// The file input should be triggered (hidden input)
		const fileInput = page.locator('[data-testid="file-input"]');
		await expect(fileInput).toBeAttached();
	});

	test("should persist state during navigation", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Fill in application title
		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Persistent Test Title");

		// Navigate to next step
		await page.locator('[data-testid="continue-button"]').click();
		await expect(page.locator('[data-testid="application-structure-step"]')).toBeVisible();

		// Navigate back
		await page.locator('[data-testid="back-button"]').click();
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();

		// Verify title is still there
		await expect(titleInput).toHaveValue("Persistent Test Title");
	});

	test("should handle URL input functionality", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test URL input
		const urlInput = page.locator('[data-testid="url-input"]');
		await expect(urlInput).toBeVisible();
		await urlInput.fill("https://example.com/grant-guidelines");

		// URL input should accept the value
		await expect(urlInput).toHaveValue("https://example.com/grant-guidelines");

		// Test clearing URL input
		await urlInput.clear();
		await expect(urlInput).toHaveValue("");
	});
});
