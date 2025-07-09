import path from "node:path";
import { expect, test } from "@playwright/test";

// Helper to get test file paths
const getTestFilePath = (filename: string) => {
	return path.join(process.cwd(), "..", "testing", "test_data", "sources", filename);
};

test.describe("Application Wizard with Mock API", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to projects and create a new application
		await page.goto("/projects");

		// Handle welcome modal if it appears
		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

		// Click on first project to enter it
		await page.locator('[data-testid="dashboard-project-card"]').first().click();
		await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);

		// Click New Application button
		await page.locator('[data-testid="new-application-button"]').click();

		// Should be in wizard
		await expect(page).toHaveURL(/\/wizard/);
		await expect(page.locator('[data-testid="wizard-page"]')).toBeVisible();
	});

	test("should navigate through wizard steps", async ({ page }) => {
		// Step 1: Application Details
		await expect(page.locator('[data-testid="step-0"][data-testid="step-active"]')).toBeVisible();
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();

		// Fill application title
		await page
			.locator('[data-testid="application-title-textarea"]')
			.fill("Climate Change Research Grant Application");

		// Click continue
		await page.locator('[data-testid="continue-button"]').click();

		// Step 2: Application Structure
		await expect(page.locator('[data-testid="step-1"][data-testid="step-active"]')).toBeVisible();

		// Continue to next step
		await page.locator('[data-testid="continue-button"]').click();

		// Step 3: Knowledge Base
		await expect(page.locator('[data-testid="step-2"][data-testid="step-active"]')).toBeVisible();

		// Continue to next step
		await page.locator('[data-testid="continue-button"]').click();

		// Step 4: Research Plan
		await expect(page.locator('[data-testid="step-3"][data-testid="step-active"]')).toBeVisible();

		// Continue to next step
		await page.locator('[data-testid="continue-button"]').click();

		// Step 5: Research Deep Dive
		await expect(page.locator('[data-testid="step-4"][data-testid="step-active"]')).toBeVisible();

		// Continue to final step
		await page.locator('[data-testid="continue-button"]').click();

		// Step 6: Generate and Complete
		await expect(page.locator('[data-testid="step-5"][data-testid="step-active"]')).toBeVisible();
	});

	test("should handle file uploads in Application Details step", async ({ page }) => {
		// We're on step 1: Application Details
		await expect(page.locator('[data-testid="application-details-step"]')).toBeVisible();

		// Fill application title
		await page.locator('[data-testid="application-title-textarea"]').fill("Test Application with Files");

		// Upload a test file
		const fileInput = page.locator('[data-testid="file-input"]');
		const testFile = getTestFilePath("guidelines/nsf/NSF- Proposal And Award Policies and Procedures Guide.pdf");

		// Click upload button to trigger file input
		await page.locator('[data-testid="upload-files-button"]').click();

		// Set file to upload
		await fileInput.setInputFiles(testFile);

		// Wait for file to be processed
		await expect(page.getByText("NSF- Proposal And Award Policies and Procedures Guide.pdf")).toBeVisible();

		// Continue to next step
		await page.locator('[data-testid="continue-button"]').click();

		// Should move to next step
		await expect(page.locator('[data-testid="step-1"][data-testid="step-active"]')).toBeVisible();
	});

	test("should handle URL input in Application Details step", async ({ page }) => {
		// Fill application title
		await page.locator('[data-testid="application-title-textarea"]').fill("Test Application with URL");

		// Add a URL
		await page.getByPlaceholder("Enter a URL").fill("https://www.nsf.gov/funding/");
		await page.keyboard.press("Enter");

		// Wait for URL to be added
		await expect(page.getByText("https://www.nsf.gov/funding/")).toBeVisible();

		// Continue to next step
		await page.locator('[data-testid="continue-button"]').click();

		// Should move to next step
		await expect(page.locator('[data-testid="step-1"][data-testid="step-active"]')).toBeVisible();
	});

	test("should navigate back through wizard steps", async ({ page }) => {
		// Fill title and go to step 2
		await page.locator('[data-testid="application-title-textarea"]').fill("Test Navigation");
		await page.locator('[data-testid="continue-button"]').click();

		// Now on step 2
		await expect(page.locator('[data-testid="step-1"][data-testid="step-active"]')).toBeVisible();

		// Click back button
		await page.locator('[data-testid="back-button"]').click();

		// Should be back on step 1
		await expect(page.locator('[data-testid="step-0"][data-testid="step-active"]')).toBeVisible();

		// Title should still be filled
		await expect(page.locator('[data-testid="application-title-textarea"]')).toHaveValue("Test Navigation");
	});

	test("should save and exit wizard", async ({ page }) => {
		// Fill application title
		await page.locator('[data-testid="application-title-textarea"]').fill("Draft Application");

		// Click Save and Exit
		await page.locator('[data-testid="exit-button"]').click();

		// Should navigate back to project page
		await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);

		// Should see the draft application in the list
		await expect(page.getByText("Draft Application")).toBeVisible();
	});
});

test.describe("Knowledge Base Step", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to Knowledge Base step quickly
		await page.goto("/projects");

		// Handle welcome modal if it appears
		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		await page.locator('[data-testid="dashboard-project-card"]').first().click();
		await page.locator('[data-testid="new-application-button"]').click();

		// Fill title and navigate to Knowledge Base step
		await page.locator('[data-testid="application-title-textarea"]').fill("Knowledge Base Test");
		await page.locator('[data-testid="continue-button"]').click(); // To step 2
		await page.locator('[data-testid="continue-button"]').click(); // To step 3 (Knowledge Base)

		await expect(page.locator('[data-testid="step-2"][data-testid="step-active"]')).toBeVisible();
	});

	test("should upload multiple files to knowledge base", async ({ page }) => {
		// Upload multiple test files
		const fileInput = page.locator('[data-testid="file-input"]');
		const testFiles = [
			getTestFilePath("cfps/MRA-2023-2024-RFP-Final.pdf"),
			getTestFilePath("guidelines/erc/ERC- Information for Applicants PoC.pdf"),
			getTestFilePath("application_sources/8b5e85e4-f962-418e-bdb0-6780edce3247/Lampel ERC StG_B2.pdf"),
		];

		// Click upload button
		await page.locator('[data-testid="upload-files-button"]').click();

		// Set multiple files
		await fileInput.setInputFiles(testFiles);

		// Wait for files to appear
		await expect(page.getByText("MRA-2023-2024-RFP-Final.pdf")).toBeVisible();
		await expect(page.getByText("ERC- Information for Applicants PoC.pdf")).toBeVisible();
		await expect(page.getByText("Lampel ERC StG_B2.pdf")).toBeVisible();

		// Check file preview section
		await expect(page.locator('[data-testid="knowledge-base-files"]')).toBeVisible();
		await expect(page.locator('[data-testid="file-collection"]').locator("> *")).toHaveCount(3);
	});

	test("should add URLs to knowledge base", async ({ page }) => {
		// Add multiple URLs
		const urlInput = page.getByPlaceholder("Enter a URL");

		// Add first URL
		await urlInput.fill("https://www.nih.gov/grants-funding");
		await page.keyboard.press("Enter");

		// Add second URL
		await urlInput.fill("https://www.nsf.gov/funding/opportunities");
		await page.keyboard.press("Enter");

		// Verify URLs are added
		await expect(page.getByText("https://www.nih.gov/grants-funding")).toBeVisible();
		await expect(page.getByText("https://www.nsf.gov/funding/opportunities")).toBeVisible();

		// Check URL preview section
		await expect(page.locator('[data-testid="knowledge-base-urls"]')).toBeVisible();
	});

	test("should show knowledge base preview", async ({ page }) => {
		// Upload a file
		const fileInput = page.locator('[data-testid="file-input"]');
		await page.locator('[data-testid="upload-files-button"]').click();
		await fileInput.setInputFiles(getTestFilePath("cfps/israeli_chief_scientist_cfp.docx"));

		// Add a URL
		await page.getByPlaceholder("Enter a URL").fill("https://example.com/grant-info");
		await page.keyboard.press("Enter");

		// Check preview section shows both files and URLs
		await expect(page.getByText("Documents")).toBeVisible();
		await expect(page.getByText("Links")).toBeVisible();

		// Preview should show the application title
		await expect(page.getByText("Knowledge Base Test")).toBeVisible();
	});
});

test.describe("Research Plan Step", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to Research Plan step
		await page.goto("/projects");

		// Handle welcome modal if it appears
		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		await page.locator('[data-testid="dashboard-project-card"]').first().click();
		await page.locator('[data-testid="new-application-button"]').click();

		// Navigate through steps
		await page.locator('[data-testid="application-title-textarea"]').fill("Research Plan Test");
		await page.locator('[data-testid="continue-button"]').click(); // To step 2
		await page.locator('[data-testid="continue-button"]').click(); // To step 3
		await page.locator('[data-testid="continue-button"]').click(); // To step 4 (Research Plan)

		await expect(page.locator('[data-testid="step-3"][data-testid="step-active"]')).toBeVisible();
	});

	test("should display research plan form fields", async ({ page }) => {
		// Check for expected form fields
		await expect(page.getByText("Research Objectives")).toBeVisible();
		await expect(page.getByText("Methodology")).toBeVisible();
		await expect(page.getByText("Timeline")).toBeVisible();
		await expect(page.getByText("Expected Outcomes")).toBeVisible();

		// Fill in some fields
		await page
			.getByLabel("Research Objectives")
			.fill("To study the effects of climate change on coastal ecosystems");
		await page.getByLabel("Methodology").fill("We will use field surveys and satellite data analysis");

		// Continue to next step
		await page.locator('[data-testid="continue-button"]').click();

		// Should move to Research Deep Dive step
		await expect(page.locator('[data-testid="step-4"][data-testid="step-active"]')).toBeVisible();
	});

	test("should trigger autofill for research plan", async ({ page }) => {
		// Look for dev autofill button (if in dev mode)
		const autofillButton = page.locator('[data-testid="dev-autofill-button"]');

		if (await autofillButton.isVisible()) {
			// Click autofill
			await autofillButton.click();

			// Should see loading state
			await expect(page.getByText("Generating content")).toBeVisible();

			// Wait for autofill to complete (mock should be fast)
			await expect(page.getByText("Autofill completed")).toBeVisible({ timeout: 10_000 });
		}
	});
});

test.describe("Generate and Complete Step", () => {
	test("should generate grant application", async ({ page }) => {
		// Navigate to final step quickly
		await page.goto("/projects");

		// Handle welcome modal if it appears
		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		await page.locator('[data-testid="dashboard-project-card"]').first().click();
		await page.locator('[data-testid="new-application-button"]').click();

		// Fill minimum required data and navigate to final step
		await page.locator('[data-testid="application-title-textarea"]').fill("Final Test Application");

		// Click continue through all steps
		for (let i = 0; i < 5; i++) {
			await page.locator('[data-testid="continue-button"]').click();
			await page.waitForTimeout(500); // Small delay between steps
		}

		// Should be on Generate and Complete step
		await expect(page.locator('[data-testid="step-5"][data-testid="step-active"]')).toBeVisible();

		// Look for generate button
		const generateButton = page.getByRole("button", { name: /generate/i });
		await expect(generateButton).toBeVisible();

		// Click generate
		await generateButton.click();

		// Should see generation progress
		await expect(page.getByText(/generating/i)).toBeVisible();

		// Mock should complete quickly
		await expect(page.getByText(/generation complete/i)).toBeVisible({ timeout: 15_000 });
	});
});

test.describe("Wizard Error Handling", () => {
	test("should show validation errors", async ({ page }) => {
		await page.goto("/projects");

		// Handle welcome modal if it appears
		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		await page.locator('[data-testid="dashboard-project-card"]').first().click();
		await page.locator('[data-testid="new-application-button"]').click();

		// Try to continue without filling title
		await page.locator('[data-testid="continue-button"]').click();

		// Should show validation error
		await expect(page.getByText(/title is required/i)).toBeVisible();

		// Fill title with too many characters (over 120)
		const longTitle = "a".repeat(125);
		await page.locator('[data-testid="application-title-textarea"]').fill(longTitle);

		// Should show character limit error
		await expect(page.getByText(/120 characters/i)).toBeVisible();
	});

	test("should handle file upload errors", async ({ page }) => {
		await page.goto("/projects");

		// Handle welcome modal if it appears
		const laterButton = page.getByRole("button", { name: "Later" });
		if (await laterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await laterButton.click();
			await page.waitForTimeout(500);
		}

		await page.locator('[data-testid="dashboard-project-card"]').first().click();
		await page.locator('[data-testid="new-application-button"]').click();

		// Try to upload a file that's too large (mock should reject)
		const fileInput = page.locator('[data-testid="file-input"]');

		// Create a large file buffer (over 100MB limit)
		const largeFileContent = Buffer.alloc(101 * 1024 * 1024); // 101MB

		await page.locator('[data-testid="upload-files-button"]').click();
		await fileInput.setInputFiles({
			buffer: largeFileContent,
			mimeType: "application/pdf",
			name: "large-file.pdf",
		});

		// Should show error message
		await expect(page.getByText(/too large/i)).toBeVisible();
	});
});
