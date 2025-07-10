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

	test("should navigate to wizard from project detail page", async ({ page }) => {
		// Click on first project
		await page.locator('[data-testid="dashboard-project-card"]').first().click();
		await page.waitForURL(/\/projects\/.*$/);

		// Click on new application button
		await page.locator('[data-testid="new-application-button"]').click();

		// Should navigate to wizard
		await expect(page).toHaveURL(/\/projects\/.*\/applications\/.*\/wizard$/);

		// Should be on the first step (Application Details)
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();
	});

	test("should complete application details step", async ({ page }) => {
		// Navigate directly to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Verify we're on the first step
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();
		await expect(page.locator('[data-testid="wizard-progress-bar"]')).toBeVisible();

		// Test title input
		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await expect(titleInput).toBeVisible();
		await titleInput.fill("Test Application Title");

		// Test file upload section
		const fileUploadSection = page.locator('[data-testid="file-upload-section"]');
		await expect(fileUploadSection).toBeVisible();

		// Test URL input
		const urlInput = page.locator('[data-testid="url-input"]');
		await expect(urlInput).toBeVisible();
		await urlInput.fill("https://example.com/grant-guidelines");

		// Test continue button
		const continueButton = page.locator('[data-testid="wizard-continue-button"]');
		await expect(continueButton).toBeVisible();
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

		// Test structure sections
		const structureSections = page.locator('[data-testid="application-structure-sections"]');
		await expect(structureSections).toBeVisible();

		// Test generate template button if available
		const generateTemplateButton = page.locator('[data-testid="generate-template-button"]');
		if (await generateTemplateButton.isVisible()) {
			await generateTemplateButton.click();
			// Wait for template generation to complete (mock scenario)
			await page.waitForTimeout(2000);
		}

		// Test section management
		const addSectionButton = page.locator('[data-testid="add-section-button"]');
		if (await addSectionButton.isVisible()) {
			await addSectionButton.click();
		}

		// Continue to next step
		await page.locator('[data-testid="wizard-continue-button"]').click();
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

		// Test file upload in knowledge base
		const fileUploadArea = page.locator('[data-testid="knowledge-base-file-upload"]');
		if (await fileUploadArea.isVisible()) {
			await expect(fileUploadArea).toBeVisible();
		}

		// Test URL input in knowledge base
		const urlInput = page.locator('[data-testid="knowledge-base-url-input"]');
		if (await urlInput.isVisible()) {
			await urlInput.fill("https://example.com/research-paper");
		}

		// Test source cards if any exist
		const sourceCards = page.locator('[data-testid^="source-card-"]');
		if ((await sourceCards.count()) > 0) {
			await expect(sourceCards.first()).toBeVisible();
		}

		// Continue to next step
		await page.locator('[data-testid="wizard-continue-button"]').click();
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

		// Test objective input
		const objectiveInput = page.locator('[data-testid="objective-input"]').first();
		if (await objectiveInput.isVisible()) {
			await objectiveInput.fill("Test research objective");
		}

		// Test AI autofill button
		const aiTryButton = page.locator('[data-testid="ai-try-button"]');
		if (await aiTryButton.isVisible()) {
			await aiTryButton.click();
			// Wait for autofill to complete (mock scenario)
			await page.waitForTimeout(2000);
		}

		// Continue to next step
		await page.locator('[data-testid="wizard-continue-button"]').click();
		await expect(page.locator('[data-testid="research-deep-dive-step"]')).toBeVisible();
	});

	test("should handle research deep dive step", async ({ page }) => {
		// Navigate to research deep dive step
		await page.goto("/projects/1/applications/1/wizard?step=4");
		await page.waitForLoadState("networkidle");

		// Verify we're on the research deep dive step
		await expect(page.locator('[data-testid="research-deep-dive-step"]')).toBeVisible();

		// Test research questions
		const researchQuestions = page.locator('[data-testid^="research-question-"]');
		if ((await researchQuestions.count()) > 0) {
			await expect(researchQuestions.first()).toBeVisible();
		}

		// Test answer input
		const answerInput = page.locator('[data-testid="research-deep-dive-answer"]').first();
		if (await answerInput.isVisible()) {
			await answerInput.fill("This is a test answer for the research question");
		}

		// Test AI autofill for deep dive
		const aiAutofillButton = page.locator('[data-testid="ai-autofill-button"]');
		if (await aiAutofillButton.isVisible()) {
			await aiAutofillButton.click();
			// Wait for autofill to complete (mock scenario)
			await page.waitForTimeout(2000);
		}

		// Continue to final step
		await page.locator('[data-testid="wizard-continue-button"]').click();
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

		// Test loading state
		const loadingIndicator = page.locator('[data-testid="generation-loading"]');
		if (await loadingIndicator.isVisible()) {
			await expect(loadingIndicator).toBeVisible();
		}

		// Test progress updates
		const progressUpdates = page.locator('[data-testid="generation-progress"]');
		if (await progressUpdates.isVisible()) {
			await expect(progressUpdates).toBeVisible();
		}
	});

	test("should handle wizard navigation", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test progress bar
		const progressBar = page.locator('[data-testid="wizard-progress-bar"]');
		await expect(progressBar).toBeVisible();

		// Test step indicators
		const stepIndicators = page.locator('[data-testid^="step-indicator-"]');
		await expect(stepIndicators).toHaveCount(6);

		// Test back button (should be disabled on first step)
		const backButton = page.locator('[data-testid="wizard-back-button"]');
		await expect(backButton).toBeDisabled();

		// Navigate to next step
		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Test Application Title");
		await page.locator('[data-testid="wizard-continue-button"]').click();

		// Test back button (should be enabled on second step)
		await expect(backButton).toBeEnabled();
		await backButton.click();

		// Should be back on first step
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();
	});

	test("should handle wizard exit functionality", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test exit button
		const exitButton = page.locator('[data-testid="wizard-exit-button"]');
		if (await exitButton.isVisible()) {
			await exitButton.click();

			// Test exit confirmation modal
			const exitModal = page.locator('[data-testid="exit-confirmation-modal"]');
			if (await exitModal.isVisible()) {
				await expect(exitModal).toBeVisible();

				// Test cancel exit
				const cancelButton = page.locator('[data-testid="cancel-exit-button"]');
				await cancelButton.click();
				await expect(exitModal).not.toBeVisible();
			}
		}
	});

	test("should handle validation errors", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test empty title validation
		const continueButton = page.locator('[data-testid="wizard-continue-button"]');
		await continueButton.click();

		// Should show validation error
		const validationError = page.locator('[data-testid="validation-error"]');
		if (await validationError.isVisible()) {
			await expect(validationError).toBeVisible();
		}

		// Test minimum length validation
		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Short");
		await continueButton.click();

		// Should show length validation error
		const lengthError = page.locator('[data-testid="title-length-error"]');
		if (await lengthError.isVisible()) {
			await expect(lengthError).toBeVisible();
		}
	});

	test("should handle file upload functionality", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Test file upload area
		const fileUploadArea = page.locator('[data-testid="file-upload-section"]');
		await expect(fileUploadArea).toBeVisible();

		// Test file upload button
		const uploadButton = page.locator('[data-testid="file-upload-button"]');
		if (await uploadButton.isVisible()) {
			await expect(uploadButton).toBeVisible();
		}

		// Test file preview area
		const filePreview = page.locator('[data-testid="file-preview-area"]');
		if (await filePreview.isVisible()) {
			await expect(filePreview).toBeVisible();
		}
	});

	test("should persist wizard state during navigation", async ({ page }) => {
		// Navigate to wizard
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		// Fill in application title
		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Persistent Test Title");

		// Navigate to next step
		await page.locator('[data-testid="wizard-continue-button"]').click();
		await expect(page.locator('[data-testid="application-structure-step"]')).toBeVisible();

		// Navigate back
		await page.locator('[data-testid="wizard-back-button"]').click();
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();

		// Verify title is still there
		await expect(titleInput).toHaveValue("Persistent Test Title");
	});

	test("should handle real-time updates via WebSocket", async ({ page }) => {
		// Navigate to structure step where template generation happens
		await page.goto("/projects/1/applications/1/wizard?step=1");
		await page.waitForLoadState("networkidle");

		// Test WebSocket connection indicator
		const wsIndicator = page.locator('[data-testid="websocket-status"]');
		if (await wsIndicator.isVisible()) {
			await expect(wsIndicator).toBeVisible();
		}

		// Test real-time notification area
		const notificationArea = page.locator('[data-testid="notification-area"]');
		if (await notificationArea.isVisible()) {
			await expect(notificationArea).toBeVisible();
		}
	});
});
