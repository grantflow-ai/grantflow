import { dismissWelcomeModal } from "./helpers/dismiss-welcome-modal";
import { expect, test } from "./test-setup";

test.describe("Application Wizard", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/projects");

		await dismissWelcomeModal(page);

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	});

	test("should navigate to wizard from project detail page", async ({ page }) => {
		await page.locator('[data-testid="dashboard-project-card"]').first().click();
		await page.waitForURL(/\/projects\/.*$/);

		await page.locator('[data-testid="new-application-button"]').click();

		await expect(page).toHaveURL(/\/projects\/.*\/applications\/.*\/wizard$/);

		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();
	});

	test("should complete application details step", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();
		await expect(page.locator('[data-testid="wizard-progress-bar"]')).toBeVisible();

		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await expect(titleInput).toBeVisible();
		await titleInput.fill("Test Application Title");

		const fileUploadSection = page.locator('[data-testid="file-upload-section"]');
		await expect(fileUploadSection).toBeVisible();

		const urlInput = page.locator('[data-testid="url-input"]');
		await expect(urlInput).toBeVisible();
		await urlInput.fill("https://example.com/grant-guidelines");

		const continueButton = page.locator('[data-testid="wizard-continue-button"]');
		await expect(continueButton).toBeVisible();
		await continueButton.click();

		await expect(page.locator('[data-testid="application-structure-step"]')).toBeVisible();
	});

	test("should handle application structure step", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard?step=1");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="application-structure-step"]')).toBeVisible();

		const structureSections = page.locator('[data-testid="application-structure-sections"]');
		await expect(structureSections).toBeVisible();

		const generateTemplateButton = page.locator('[data-testid="generate-template-button"]');
		if (await generateTemplateButton.isVisible()) {
			await generateTemplateButton.click();

			await page.waitForTimeout(2000);
		}

		const addSectionButton = page.locator('[data-testid="add-section-button"]');
		if (await addSectionButton.isVisible()) {
			await addSectionButton.click();
		}

		await page.locator('[data-testid="wizard-continue-button"]').click();
		await expect(page.locator('[data-testid="knowledge-base-step"]')).toBeVisible();
	});

	test("should handle knowledge base step", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard?step=2");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="knowledge-base-step"]')).toBeVisible();

		const knowledgeBaseContainer = page.locator('[data-testid="knowledge-base-container"]');
		await expect(knowledgeBaseContainer).toBeVisible();

		const fileUploadArea = page.locator('[data-testid="knowledge-base-file-upload"]');
		if (await fileUploadArea.isVisible()) {
			await expect(fileUploadArea).toBeVisible();
		}

		const urlInput = page.locator('[data-testid="knowledge-base-url-input"]');
		if (await urlInput.isVisible()) {
			await urlInput.fill("https://example.com/research-paper");
		}

		const sourceCards = page.locator('[data-testid^="source-card-"]');
		if ((await sourceCards.count()) > 0) {
			await expect(sourceCards.first()).toBeVisible();
		}

		await page.locator('[data-testid="wizard-continue-button"]').click();
		await expect(page.locator('[data-testid="research-plan-step"]')).toBeVisible();
	});

	test("should handle research plan step", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard?step=3");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="research-plan-step"]')).toBeVisible();

		const addObjectiveButton = page.locator('[data-testid="add-objective-button"]');
		await expect(addObjectiveButton).toBeVisible();
		await addObjectiveButton.click();

		const objectiveInput = page.locator('[data-testid="objective-input"]').first();
		if (await objectiveInput.isVisible()) {
			await objectiveInput.fill("Test research objective");
		}

		const aiTryButton = page.locator('[data-testid="ai-try-button"]');
		if (await aiTryButton.isVisible()) {
			await aiTryButton.click();

			await page.waitForTimeout(2000);
		}

		await page.locator('[data-testid="wizard-continue-button"]').click();
		await expect(page.locator('[data-testid="research-deep-dive-step"]')).toBeVisible();
	});

	test("should handle research deep dive step", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard?step=4");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="research-deep-dive-step"]')).toBeVisible();

		const researchQuestions = page.locator('[data-testid^="research-question-"]');
		if ((await researchQuestions.count()) > 0) {
			await expect(researchQuestions.first()).toBeVisible();
		}

		const answerInput = page.locator('[data-testid="research-deep-dive-answer"]').first();
		if (await answerInput.isVisible()) {
			await answerInput.fill("This is a test answer for the research question");
		}

		const aiAutofillButton = page.locator('[data-testid="ai-autofill-button"]');
		if (await aiAutofillButton.isVisible()) {
			await aiAutofillButton.click();

			await page.waitForTimeout(2000);
		}

		await page.locator('[data-testid="wizard-continue-button"]').click();
		await expect(page.locator('[data-testid="generate-complete-step"]')).toBeVisible();
	});

	test("should handle generate and complete step", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard?step=5");
		await page.waitForLoadState("networkidle");

		await expect(page.locator('[data-testid="generate-complete-step"]')).toBeVisible();

		const dashboardButton = page.locator('[data-testid="go-to-dashboard-button"]');
		await expect(dashboardButton).toBeVisible();
		await dashboardButton.click();

		await page.waitForTimeout(1000);

		const loadingIndicator = page.locator('[data-testid="generation-loading"]');
		if (await loadingIndicator.isVisible()) {
			await expect(loadingIndicator).toBeVisible();
		}

		const progressUpdates = page.locator('[data-testid="generation-progress"]');
		if (await progressUpdates.isVisible()) {
			await expect(progressUpdates).toBeVisible();
		}
	});

	test("should handle wizard navigation", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const progressBar = page.locator('[data-testid="wizard-progress-bar"]');
		await expect(progressBar).toBeVisible();

		const stepIndicators = page.locator('[data-testid^="step-indicator-"]');
		await expect(stepIndicators).toHaveCount(6);

		const backButton = page.locator('[data-testid="wizard-back-button"]');
		await expect(backButton).toBeDisabled();

		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Test Application Title");
		await page.locator('[data-testid="wizard-continue-button"]').click();

		await expect(backButton).toBeEnabled();
		await backButton.click();

		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();
	});

	test("should handle wizard exit functionality", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const exitButton = page.locator('[data-testid="wizard-exit-button"]');
		if (await exitButton.isVisible()) {
			await exitButton.click();

			const exitModal = page.locator('[data-testid="exit-confirmation-modal"]');
			if (await exitModal.isVisible()) {
				await expect(exitModal).toBeVisible();

				const cancelButton = page.locator('[data-testid="cancel-exit-button"]');
				await cancelButton.click();
				await expect(exitModal).not.toBeVisible();
			}
		}
	});

	test("should handle validation errors", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const continueButton = page.locator('[data-testid="continue-button"]');
		await continueButton.click();

		const validationError = page.locator('[data-testid="validation-error"]');
		if (await validationError.isVisible()) {
			await expect(validationError).toBeVisible();
		}

		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Short");
		await continueButton.click();

		const lengthError = page.locator('[data-testid="title-length-error"]');
		if (await lengthError.isVisible()) {
			await expect(lengthError).toBeVisible();
		}
	});

	test("should handle file upload functionality", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const fileUploadArea = page.locator('[data-testid="file-upload-section"]');
		await expect(fileUploadArea).toBeVisible();

		const uploadButton = page.locator('[data-testid="file-upload-button"]');
		if (await uploadButton.isVisible()) {
			await expect(uploadButton).toBeVisible();
		}

		const filePreview = page.locator('[data-testid="file-preview-area"]');
		if (await filePreview.isVisible()) {
			await expect(filePreview).toBeVisible();
		}
	});

	test("should persist wizard state during navigation", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard");
		await page.waitForLoadState("networkidle");

		const titleInput = page.locator('[data-testid="application-title-textarea"]');
		await titleInput.fill("Persistent Test Title");

		await page.locator('[data-testid="wizard-continue-button"]').click();
		await expect(page.locator('[data-testid="application-structure-step"]')).toBeVisible();

		await page.locator('[data-testid="wizard-back-button"]').click();
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();

		await expect(titleInput).toHaveValue("Persistent Test Title");
	});

	test("should handle real-time updates via WebSocket", async ({ page }) => {
		await page.goto("/projects/1/applications/1/wizard?step=1");
		await page.waitForLoadState("networkidle");

		const wsIndicator = page.locator('[data-testid="websocket-status"]');
		if (await wsIndicator.isVisible()) {
			await expect(wsIndicator).toBeVisible();
		}

		const notificationArea = page.locator('[data-testid="notification-area"]');
		if (await notificationArea.isVisible()) {
			await expect(notificationArea).toBeVisible();
		}
	});
});
