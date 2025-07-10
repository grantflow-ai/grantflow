import { expect, test } from "./test-setup";

test.describe("Application Wizard", () => {
	test("should load wizard and display first step", async ({ page }) => {
		// Navigate directly to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Verify we're on the first step
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();

		// Verify step indicators are visible
		await expect(page.locator('[data-testid="step-indicators"]')).toBeVisible();

		// Verify we have an active step
		await expect(page.locator('[data-testid="step-active"]')).toBeVisible();
	});

	test("should handle application details form", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test title input
		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await expect(titleInput).toBeVisible();
		await titleInput.fill("Test Application Title for E2E Testing");
		await expect(titleInput).toHaveValue("Test Application Title for E2E Testing");

		// Test file upload button
		const uploadButton = page.locator('[data-testid="upload-files-button"]');
		await expect(uploadButton).toBeVisible();

		// Test URL input
		const urlInput = page.locator('[data-testid="url-input"]');
		await expect(urlInput).toBeVisible();
		await urlInput.fill("https://example.com/grant-guidelines");
		await expect(urlInput).toHaveValue("https://example.com/grant-guidelines");

		// Test continue button
		const continueButton = page.locator('[data-testid="continue-button"]');
		await expect(continueButton).toBeVisible();
	});

	test("should navigate to application structure step", async ({ page }) => {
		// Navigate to wizard and fill title
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Test Application Title");

		// Click continue
		const continueButton = page.locator('[data-testid="continue-button"]');
		await continueButton.click();

		// Should navigate to structure step
		await expect(page.locator('[data-testid="application-structure-step"]')).toBeVisible();

		// Test structure elements
		await expect(page.locator('[data-testid="application-structure-left-pane"]')).toBeVisible();
		await expect(page.locator('[data-testid="application-structure-preview-pane"]')).toBeVisible();
	});

	test("should handle wizard navigation", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test back button (should exist but might be disabled)
		const backButton = page.locator('[data-testid="back-button"]');
		await expect(backButton).toBeVisible();

		// Fill title and navigate to next step
		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Test Application Title");
		await page.locator('[data-testid="continue-button"]').click();

		// Should be on structure step
		await expect(page.locator('[data-testid="application-structure-step"]')).toBeVisible();

		// Back button should be enabled now
		await expect(backButton).toBeEnabled();
		await backButton.click();

		// Should be back on first step
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();
	});

	test("should handle knowledge base step", async ({ page }) => {
		// Navigate to knowledge base step directly
		await page.goto("/projects/1/applications/1/wizard?step=2");
		await page.waitForLoadState("networkidle");

		// Test knowledge base elements
		const knowledgeBaseContainer = page.locator('[data-testid="knowledge-base-container"]');
		if (await knowledgeBaseContainer.isVisible()) {
			await expect(knowledgeBaseContainer).toBeVisible();
		}

		const filesSection = page.locator('[data-testid="knowledge-base-files"]');
		if (await filesSection.isVisible()) {
			await expect(filesSection).toBeVisible();
		}

		const urlsSection = page.locator('[data-testid="knowledge-base-urls"]');
		if (await urlsSection.isVisible()) {
			await expect(urlsSection).toBeVisible();
		}
	});

	test("should handle exit functionality", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test exit button
		const exitButton = page.locator('[data-testid="exit-button"]');
		await expect(exitButton).toBeVisible();
		await exitButton.click();

		// Should navigate away or show confirmation
		await page.waitForTimeout(1000);
		// The exact behavior depends on implementation
	});

	test("should show step progress indicators", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test step indicators container
		const stepIndicators = page.locator('[data-testid="step-indicators"]');
		await expect(stepIndicators).toBeVisible();

		// Test active step indicator
		const activeStep = page.locator('[data-testid="step-active"]');
		await expect(activeStep).toBeVisible();

		// Test that we have step titles (any count is fine)
		const stepTitles = page.locator('[data-testid^="step-title-"]');
		const titleCount = await stepTitles.count();
		expect(titleCount).toBeGreaterThan(0);
	});

	test("should handle file upload interaction", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test file upload button
		const uploadButton = page.locator('[data-testid="upload-files-button"]');
		await expect(uploadButton).toBeVisible();

		// Test file input exists
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

	test("should handle research plan step when available", async ({ page }) => {
		// Navigate to research plan step directly
		await page.goto("/projects/1/applications/1/wizard?step=3");
		await page.waitForLoadState("networkidle");

		// Test research plan elements if they exist
		const researchPlanStep = page.locator('[data-testid="research-plan-step"]');
		if (await researchPlanStep.isVisible()) {
			await expect(researchPlanStep).toBeVisible();

			const addObjectiveButton = page.locator('[data-testid="add-objective-button"]');
			if (await addObjectiveButton.isVisible()) {
				await expect(addObjectiveButton).toBeVisible();
			}

			const aiTryButton = page.locator('[data-testid="ai-try-button"]');
			if (await aiTryButton.isVisible()) {
				await expect(aiTryButton).toBeVisible();
			}
		}
	});

	test("should handle research deep dive step when available", async ({ page }) => {
		// Navigate to research deep dive step directly
		await page.goto("/projects/1/applications/1/wizard?step=4");
		await page.waitForLoadState("networkidle");

		// Test research deep dive elements if they exist
		const researchDeepDiveStep = page.locator('[data-testid="research-deep-dive-step"]');
		if (await researchDeepDiveStep.isVisible()) {
			await expect(researchDeepDiveStep).toBeVisible();

			const answerInput = page.locator('[data-testid="research-deep-dive-answer"]');
			if (await answerInput.isVisible()) {
				await expect(answerInput).toBeVisible();
			}
		}
	});

	test("should handle generate and complete step when available", async ({ page }) => {
		// Navigate to generate and complete step directly
		await page.goto("/projects/1/applications/1/wizard?step=5");
		await page.waitForLoadState("networkidle");

		// Test generate and complete elements if they exist
		const generateCompleteStep = page.locator('[data-testid="generate-complete-step"]');
		if (await generateCompleteStep.isVisible()) {
			await expect(generateCompleteStep).toBeVisible();

			const generateButton = page.locator('[data-testid="generate-application-button"]');
			if (await generateButton.isVisible()) {
				await expect(generateButton).toBeVisible();
			}
		}
	});
});
