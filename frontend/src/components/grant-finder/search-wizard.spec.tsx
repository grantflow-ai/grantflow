import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchWizard } from "./search-wizard";

// Mock the toast
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
	},
}));

describe.sequential("SearchWizard", () => {
	const mockOnSubmit = vi.fn();
	const user = userEvent.setup();

	beforeEach(() => {
		mockOnSubmit.mockClear();
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("renders search wizard with testid", () => {
		render(<SearchWizard onSubmit={mockOnSubmit} />);
		expect(screen.getByTestId("search-wizard")).toBeInTheDocument();
	});

	it("renders progress bar", () => {
		render(<SearchWizard onSubmit={mockOnSubmit} />);
		expect(screen.getByTestId("wizard-progress-bar")).toBeInTheDocument();
		expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
	});

	it("renders step content container", () => {
		render(<SearchWizard onSubmit={mockOnSubmit} />);
		expect(screen.getByTestId("wizard-step-content")).toBeInTheDocument();
	});

	it("renders navigation buttons", () => {
		render(<SearchWizard onSubmit={mockOnSubmit} />);
		expect(screen.getByTestId("wizard-navigation")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-back-button")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-next-button")).toBeInTheDocument();
	});

	it("starts with keywords step", () => {
		render(<SearchWizard onSubmit={mockOnSubmit} />);
		expect(screen.getByTestId("keywords-step")).toBeInTheDocument();
		expect(screen.getByTestId("keywords-step-title")).toHaveTextContent("Keywords");
	});

	it("back button is invisible on first step", () => {
		render(<SearchWizard onSubmit={mockOnSubmit} />);
		const backButton = screen.getByTestId("wizard-back-button");
		expect(backButton).toHaveClass("invisible");
	});

	it("next button is disabled when keywords step is invalid", () => {
		render(<SearchWizard onSubmit={mockOnSubmit} />);
		const nextButton = screen.getByTestId("wizard-next-button");
		expect(nextButton).toBeDisabled();
		expect(nextButton).toHaveClass("cursor-not-allowed", "bg-gray-300");
	});

	it("next button is enabled when keywords are entered", async () => {
		render(<SearchWizard onSubmit={mockOnSubmit} />);

		const keywordsTextarea = screen.getByTestId("keywords-textarea");
		await user.type(keywordsTextarea, "CRISPR, cancer research");

		const nextButton = screen.getByTestId("wizard-next-button");
		expect(nextButton).not.toBeDisabled();
		expect(nextButton).toHaveClass("bg-blue-600", "hover:bg-blue-700");
	});

	describe("Multi-step navigation", () => {
		it("navigates through all steps in order", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			// Step 1: Keywords
			expect(screen.getByTestId("keywords-step")).toBeInTheDocument();

			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR");

			let nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			// Step 2: Activity codes
			expect(screen.getByTestId("activity-codes-step")).toBeInTheDocument();
			expect(screen.getByTestId("activity-codes-step-title")).toHaveTextContent("NIH Activity Codes");

			nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			// Step 3: Institution location
			expect(screen.getByTestId("institution-location-step")).toBeInTheDocument();
			expect(screen.getByTestId("institution-location-step-title")).toHaveTextContent("Institution Location");

			const institutionSelect = screen.getByTestId("institution-location-select");
			await user.selectOptions(institutionSelect, "U.S. institution (no foreign component)");

			nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			// Step 4: Career stage
			expect(screen.getByTestId("career-stage-step")).toBeInTheDocument();
			expect(screen.getByTestId("career-stage-step-title")).toHaveTextContent("Career Stage");

			const careerSelect = screen.getByTestId("career-stage-select");
			await user.selectOptions(careerSelect, "Early-stage (≤ 10 yrs)");

			nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			// Step 5: Email alerts
			expect(screen.getByTestId("email-alerts-step")).toBeInTheDocument();
			expect(screen.getByTestId("email-alerts-step-title")).toHaveTextContent("Email for Alerts");
		});

		it("can navigate backwards through steps", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			// Navigate to step 3
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR");

			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton); // Step 2
			await user.click(nextButton); // Step 3

			expect(screen.getByTestId("institution-location-step")).toBeInTheDocument();

			// Navigate backwards
			const backButton = screen.getByTestId("wizard-back-button");
			await user.click(backButton); // Back to step 2

			expect(screen.getByTestId("activity-codes-step")).toBeInTheDocument();

			await user.click(backButton); // Back to step 1
			expect(screen.getByTestId("keywords-step")).toBeInTheDocument();
		});

		it("preserves form data across steps", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			// Fill in keywords and navigate forward
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR, gene editing");

			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);
			await user.click(nextButton); // Skip activity codes step

			// Go back to keywords step
			const backButton = screen.getByTestId("wizard-back-button");
			await user.click(backButton);
			await user.click(backButton);

			// Check that keywords are preserved
			expect(screen.getByTestId("keywords-textarea")).toHaveValue("CRISPR, gene editing");
		});
	});

	describe("Step validation", () => {
		it("validates keywords step", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			const nextButton = screen.getByTestId("wizard-next-button");
			expect(nextButton).toBeDisabled();

			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "cancer");

			expect(nextButton).not.toBeDisabled();

			await user.clear(keywordsTextarea);
			expect(nextButton).toBeDisabled();
		});

		it("does not validate activity codes step (optional)", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			// Navigate to activity codes step
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR");

			let nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			// Activity codes step should allow proceeding without selection
			nextButton = screen.getByTestId("wizard-next-button");
			expect(nextButton).not.toBeDisabled();
		});

		it("validates institution location step", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			// Navigate to institution location step
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR");

			let nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton); // Activity codes
			await user.click(nextButton); // Institution location

			// Should be disabled without selection
			nextButton = screen.getByTestId("wizard-next-button");
			expect(nextButton).toBeDisabled();

			// Enable after selection
			const institutionSelect = screen.getByTestId("institution-location-select");
			await user.selectOptions(institutionSelect, "U.S. institution (no foreign component)");

			expect(nextButton).not.toBeDisabled();
		});

		it("validates career stage step", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			// Navigate to career stage step
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR");

			let nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton); // Activity codes
			await user.click(nextButton); // Institution location

			const institutionSelect = screen.getByTestId("institution-location-select");
			await user.selectOptions(institutionSelect, "U.S. institution (no foreign component)");

			await user.click(nextButton); // Career stage

			// Should be disabled without selection
			nextButton = screen.getByTestId("wizard-next-button");
			expect(nextButton).toBeDisabled();

			// Enable after selection
			const careerSelect = screen.getByTestId("career-stage-select");
			await user.selectOptions(careerSelect, "Early-stage (≤ 10 yrs)");

			expect(nextButton).not.toBeDisabled();
		});

		it("validates email alerts step", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			// Navigate to email step without filling email form
			await navigateToEmailStep(user, { fillEmailForm: false });

			const submitButton = screen.getByTestId("wizard-submit-button");
			expect(submitButton).toBeDisabled();
			expect(submitButton).toHaveTextContent("Get Alerts");

			// Enter email but no terms agreement
			const emailInput = screen.getByTestId("email-alerts-input");
			await user.type(emailInput, "test@example.com");

			expect(submitButton).toBeDisabled();

			// Agree to terms
			const termsCheckbox = screen.getByTestId("terms-checkbox");
			await user.click(termsCheckbox);

			expect(submitButton).not.toBeDisabled();
		});
	});

	describe("Form submission", () => {
		it("shows form summary on final step", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			await navigateToEmailStep(user, { fillEmailForm: true });

			expect(screen.getByTestId("wizard-form-summary")).toBeInTheDocument();
			expect(screen.getByTestId("form-summary")).toBeInTheDocument();
		});

		it("submits form with correct data format", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			// Fill out complete form
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR, cancer research, gene editing");

			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			// Skip activity codes
			await user.click(nextButton);

			const institutionSelect = screen.getByTestId("institution-location-select");
			await user.selectOptions(institutionSelect, "U.S. institution (no foreign component)");
			await user.click(nextButton);

			const careerSelect = screen.getByTestId("career-stage-select");
			await user.selectOptions(careerSelect, "Early-stage (≤ 10 yrs)");
			await user.click(nextButton);

			const emailInput = screen.getByTestId("email-alerts-input");
			await user.type(emailInput, "researcher@university.edu");

			const termsCheckbox = screen.getByTestId("terms-checkbox");
			await user.click(termsCheckbox);

			const updatesCheckbox = screen.getByTestId("updates-checkbox");
			await user.click(updatesCheckbox);

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			expect(mockOnSubmit).toHaveBeenCalledWith({
				activityCodes: undefined,
				careerStage: "Early-stage (≤ 10 yrs)",
				email: "researcher@university.edu",
				institutionLocation: "U.S. institution (no foreign component)",
				keywords: ["CRISPR", "cancer research", "gene editing"],
			});
		});

		it("submits form with minimal required data", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			// Only fill required fields
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "machine learning");

			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton); // Skip activity codes
			await user.click(nextButton);

			const institutionSelect = screen.getByTestId("institution-location-select");
			await user.selectOptions(institutionSelect, "Non-U.S. (foreign) institution");
			await user.click(nextButton);

			const careerSelect = screen.getByTestId("career-stage-select");
			await user.selectOptions(careerSelect, "Senior (> 20 yrs)");
			await user.click(nextButton);

			const emailInput = screen.getByTestId("email-alerts-input");
			await user.type(emailInput, "test@domain.org");

			const termsCheckbox = screen.getByTestId("terms-checkbox");
			await user.click(termsCheckbox);

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			expect(mockOnSubmit).toHaveBeenCalledWith({
				activityCodes: undefined,
				careerStage: "Senior (> 20 yrs)",
				email: "test@domain.org",
				institutionLocation: "Non-U.S. (foreign) institution",
				keywords: ["machine learning"],
			});
		});

		it("handles keywords with commas correctly", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			await navigateToEmailStep(user, {
				fillEmailForm: true,
				keywords: "CRISPR-Cas9, single-cell RNA-seq, immunotherapy, precision medicine",
			});

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			expect(mockOnSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					keywords: ["CRISPR-Cas9", "single-cell RNA-seq", "immunotherapy", "precision medicine"],
				}),
			);
		});

		it("filters out empty keywords", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			await navigateToEmailStep(user, {
				fillEmailForm: true,
				keywords: "CRISPR, , cancer research, ,gene editing  ,",
			});

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			expect(mockOnSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					keywords: ["CRISPR", "cancer research", "gene editing"],
				}),
			);
		});
	});

	describe("Form data persistence", () => {
		it("preserves all form data during navigation", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			// Fill step 1
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "proteomics");
			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			// Fill step 2 - activity codes would need MultiSelect interaction
			await user.click(nextButton); // Skip for now

			// Fill step 3
			const institutionSelect = screen.getByTestId("institution-location-select");
			await user.selectOptions(institutionSelect, "U.S. institution with foreign component");
			await user.click(nextButton);

			// Fill step 4
			const careerSelect = screen.getByTestId("career-stage-select");
			await user.selectOptions(careerSelect, "Mid-career (11–20 yrs)");
			await user.click(nextButton);

			// Fill step 5
			const emailInput = screen.getByTestId("email-alerts-input");
			await user.type(emailInput, "test@research.edu");
			const termsCheckbox = screen.getByTestId("terms-checkbox");
			await user.click(termsCheckbox);

			// Navigate back and verify data persistence
			const backButton = screen.getByTestId("wizard-back-button");
			await user.click(backButton); // Step 4

			expect(screen.getByTestId("career-stage-select")).toHaveValue("Mid-career (11–20 yrs)");

			await user.click(backButton); // Step 3
			expect(screen.getByTestId("institution-location-select")).toHaveValue(
				"U.S. institution with foreign component",
			);

			await user.click(backButton); // Step 2 (activity codes)
			await user.click(backButton); // Step 1

			expect(screen.getByTestId("keywords-textarea")).toHaveValue("proteomics");
		});
	});

	describe("Accessibility", () => {
		it("has proper heading hierarchy", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			// Check first step heading
			const keywordsTitle = screen.getByTestId("keywords-step-title");
			expect(keywordsTitle.tagName).toBe("H3");
		});

		it("has proper form labels", () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			const keywordsLabel = screen.getByTestId("keywords-input-label");
			const keywordsTextarea = screen.getByTestId("keywords-textarea");

			expect(keywordsLabel).toHaveAttribute("for", "keywords");
			expect(keywordsTextarea).toHaveAttribute("id", "keywords");
		});

		it("has proper button types", () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			expect(screen.getByTestId("wizard-back-button")).toHaveAttribute("type", "button");
			expect(screen.getByTestId("wizard-next-button")).toHaveAttribute("type", "button");
		});
	});

	describe("Edge cases", () => {
		it("handles empty form submission gracefully", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			// Try to navigate through without filling required fields
			const nextButton = screen.getByTestId("wizard-next-button");
			expect(nextButton).toBeDisabled();
		});

		it("handles very long keywords input", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			const longKeywords = `${"a".repeat(1000)}, ${"b".repeat(1000)}`;
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, longKeywords);

			const nextButton = screen.getByTestId("wizard-next-button");
			expect(nextButton).not.toBeDisabled();
		});

		it("handles special characters in keywords", async () => {
			render(<SearchWizard onSubmit={mockOnSubmit} />);

			const specialKeywords = "CRISPR-Cas9, α-synuclein, β-amyloid, γ-secretase";
			await navigateToEmailStep(user, { fillEmailForm: true, keywords: specialKeywords });

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			expect(mockOnSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					keywords: ["CRISPR-Cas9", "α-synuclein", "β-amyloid", "γ-secretase"],
				}),
			);
		});
	});
});

// Helper function to navigate to the email step
async function navigateToEmailStep(
	user: ReturnType<typeof userEvent.setup>,
	options: Partial<{ fillEmailForm?: boolean; keywords: string }> = {},
) {
	const keywordsTextarea = screen.getByTestId("keywords-textarea");
	await user.type(keywordsTextarea, options.keywords ?? "CRISPR");

	const nextButton = screen.getByTestId("wizard-next-button");
	await user.click(nextButton); // Activity codes (skip)
	await user.click(nextButton); // Institution location

	const institutionSelect = screen.getByTestId("institution-location-select");
	await user.selectOptions(institutionSelect, "U.S. institution (no foreign component)");
	await user.click(nextButton); // Career stage

	const careerSelect = screen.getByTestId("career-stage-select");
	await user.selectOptions(careerSelect, "Early-stage (≤ 10 yrs)");
	await user.click(nextButton); // Email alerts

	// Only fill email form if explicitly requested
	if (options.fillEmailForm) {
		const emailInput = screen.getByTestId("email-alerts-input");
		await user.type(emailInput, "test@example.com");

		const termsCheckbox = screen.getByTestId("terms-checkbox");
		await user.click(termsCheckbox);
	}
}
