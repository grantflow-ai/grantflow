import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchWizard } from "./search-wizard";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(() => ({
		push: vi.fn(),
	})),
}));

vi.mock("@/actions/grants", () => ({
	createSubscription: vi.fn().mockResolvedValue({}),
}));

describe.sequential("SearchWizard", () => {
	const user = userEvent.setup();

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("renders search wizard with testid", () => {
		render(<SearchWizard />);
		expect(screen.getByTestId("search-wizard")).toBeInTheDocument();
	});

	it("renders progress bar", () => {
		render(<SearchWizard />);
		expect(screen.getByTestId("wizard-progress-bar")).toBeInTheDocument();
		expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
	});

	it("renders step content container", () => {
		render(<SearchWizard />);
		expect(screen.getByTestId("wizard-step-content")).toBeInTheDocument();
	});

	it("renders navigation buttons", () => {
		render(<SearchWizard />);
		expect(screen.getByTestId("wizard-navigation")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-back-button")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-next-button")).toBeInTheDocument();
	});

	it("starts with keywords step", () => {
		render(<SearchWizard />);
		expect(screen.getByTestId("keywords-step")).toBeInTheDocument();
		expect(screen.getByTestId("keywords-step-title")).toHaveTextContent("Keywords");
	});

	it("back button is invisible on first step", () => {
		render(<SearchWizard />);
		const backButton = screen.getByTestId("wizard-back-button");
		expect(backButton).toHaveClass("invisible");
	});

	it("next button is disabled when keywords step is invalid", () => {
		render(<SearchWizard />);
		const nextButton = screen.getByTestId("wizard-next-button");
		expect(nextButton).toBeDisabled();
	});

	it("next button is enabled when keywords are entered", async () => {
		render(<SearchWizard />);

		const keywordsTextarea = screen.getByTestId("keywords-textarea");
		await user.type(keywordsTextarea, "CRISPR, cancer research");

		const nextButton = screen.getByTestId("wizard-next-button");
		expect(nextButton).not.toBeDisabled();
	});

	describe("Multi-step navigation", () => {
		it("navigates through all steps in order", async () => {
			render(<SearchWizard />);

			expect(screen.getByTestId("keywords-step")).toBeInTheDocument();

			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR");

			let nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			expect(screen.getByTestId("activity-codes-step")).toBeInTheDocument();
			expect(screen.getByTestId("activity-codes-step-title")).toHaveTextContent("NIH Activity Codes");

			nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			expect(screen.getByTestId("institution-location-step")).toBeInTheDocument();
			expect(screen.getByTestId("institution-location-step-title")).toHaveTextContent("Institution Location");

			const institutionTrigger = screen.getByTestId("institution-location-multiselect-trigger");
			await user.click(institutionTrigger);
			const institutionOption = screen.getByTestId(
				"institution-location-multiselect-option-u-s--institution--no-foreign-component-",
			);
			await user.click(institutionOption);
			nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			expect(screen.getByTestId("career-stage-step")).toBeInTheDocument();
			expect(screen.getByTestId("career-stage-step-title")).toHaveTextContent("Career Stage");

			const careerTrigger = screen.getByTestId("career-stage-multiselect-trigger");
			await user.click(careerTrigger);
			const careerOption = screen.getByTestId("career-stage-multiselect-option-early-stage----10-yrs-");
			await user.click(careerOption);

			nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			expect(screen.getByTestId("email-alerts-step")).toBeInTheDocument();
			expect(screen.getByTestId("email-alerts-step-title")).toHaveTextContent("Alerts Setting");
		});

		it("can navigate backwards through steps", async () => {
			render(<SearchWizard />);

			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR");

			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);
			await user.click(nextButton);

			expect(screen.getByTestId("institution-location-step")).toBeInTheDocument();

			const backButton = screen.getByTestId("wizard-back-button");
			await user.click(backButton);

			expect(screen.getByTestId("activity-codes-step")).toBeInTheDocument();

			await user.click(backButton);
			expect(screen.getByTestId("keywords-step")).toBeInTheDocument();
		});

		it("preserves form data across steps", async () => {
			render(<SearchWizard />);

			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR, gene editing");

			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);
			await user.click(nextButton);

			const backButton = screen.getByTestId("wizard-back-button");
			await user.click(backButton);
			await user.click(backButton);

			expect(screen.getByTestId("keywords-textarea")).toHaveValue("CRISPR, gene editing");
		});
	});

	describe("Step validation", () => {
		it("validates keywords step", async () => {
			render(<SearchWizard />);

			const nextButton = screen.getByTestId("wizard-next-button");
			expect(nextButton).toBeDisabled();

			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "cancer");

			expect(nextButton).not.toBeDisabled();

			await user.clear(keywordsTextarea);
			expect(nextButton).toBeDisabled();
		});

		it("does not validate activity codes step (optional)", async () => {
			render(<SearchWizard />);

			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR");

			let nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			nextButton = screen.getByTestId("wizard-next-button");
			expect(nextButton).not.toBeDisabled();
		});

		it("validates institution location step", async () => {
			render(<SearchWizard />);

			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR");

			let nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);
			await user.click(nextButton);

			nextButton = screen.getByTestId("wizard-next-button");
			expect(nextButton).toBeDisabled();

			const institutionTrigger = screen.getByTestId("institution-location-multiselect-trigger");
			await user.click(institutionTrigger);
			const institutionOption = screen.getByTestId(
				"institution-location-multiselect-option-u-s--institution--no-foreign-component-",
			);
			await user.click(institutionOption);
			expect(nextButton).not.toBeDisabled();
		});

		it("validates career stage step", async () => {
			render(<SearchWizard />);

			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR");

			let nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);
			await user.click(nextButton);

			const institutionTrigger = screen.getByTestId("institution-location-multiselect-trigger");
			await user.click(institutionTrigger);
			const institutionOption = screen.getByTestId(
				"institution-location-multiselect-option-u-s--institution--no-foreign-component-",
			);
			await user.click(institutionOption);

			await user.click(nextButton);

			nextButton = screen.getByTestId("wizard-next-button");
			expect(nextButton).toBeDisabled();

			const careerTrigger = screen.getByTestId("career-stage-multiselect-trigger");
			await user.click(careerTrigger);
			const careerOption = screen.getByTestId("career-stage-multiselect-option-early-stage----10-yrs-");
			await user.click(careerOption);

			expect(nextButton).not.toBeDisabled();
		});
		it("validates email alerts step", async () => {
			render(<SearchWizard />);

			await navigateToEmailStep(user, { fillEmailForm: false });

			const submitButton = screen.getByTestId("wizard-submit-button");
			expect(submitButton).toBeDisabled();

			const emailInput = screen.getByTestId("email-alerts-input");
			await user.type(emailInput, "test@example.com");

			expect(submitButton).toBeDisabled();

			const termsCheckbox = screen.getByTestId("terms-checkbox");
			await user.click(termsCheckbox);

			expect(submitButton).not.toBeDisabled();
		});
	});

	describe("Form submission", () => {
		it("shows form summary on final step", async () => {
			render(<SearchWizard />);

			await navigateToEmailStep(user, { fillEmailForm: true });

			expect(screen.getByTestId("wizard-form-summary")).toBeInTheDocument();
			expect(screen.getByTestId("form-summary")).toBeInTheDocument();
		});

		it("submits form with correct data format", async () => {
			const { createSubscription } = await import("@/actions/grants");
			render(<SearchWizard />);

			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "CRISPR, cancer research, gene editing");

			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			await user.click(nextButton);

			const institutionTrigger = screen.getByTestId("institution-location-multiselect-trigger");
			await user.click(institutionTrigger);
			const institutionOption = screen.getByTestId(
				"institution-location-multiselect-option-u-s--institution--no-foreign-component-",
			);
			await user.click(institutionOption);
			await user.click(nextButton);

			const careerTrigger = screen.getByTestId("career-stage-multiselect-trigger");
			await user.click(careerTrigger);
			const careerOption = screen.getByTestId("career-stage-multiselect-option-early-stage----10-yrs-");
			await user.click(careerOption);
			await user.click(nextButton);

			const emailInput = screen.getByTestId("email-alerts-input");
			await user.type(emailInput, "researcher@university.edu");

			const termsCheckbox = screen.getByTestId("terms-checkbox");
			await user.click(termsCheckbox);

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			expect(createSubscription).toHaveBeenCalledWith({
				email: "researcher@university.edu",
				search_params: {
					category: "",
					deadline_after: "",
					deadline_before: "",
					limit: 20,
					max_amount: 0,
					min_amount: 0,
					offset: 0,
					query: "CRISPR cancer research gene editing",
				},
			});
		});

		it("submits form with minimal required data", async () => {
			const { createSubscription } = await import("@/actions/grants");
			render(<SearchWizard />);

			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "machine learning");

			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);
			await user.click(nextButton);

			const institutionTrigger = screen.getByTestId("institution-location-multiselect-trigger");
			await user.click(institutionTrigger);
			const institutionOption = screen.getByTestId(
				"institution-location-multiselect-option-non-u-s---foreign--institution",
			);
			await user.click(institutionOption);
			await user.click(nextButton);

			const careerTrigger = screen.getByTestId("career-stage-multiselect-trigger");
			await user.click(careerTrigger);
			const careerOption = screen.getByTestId("career-stage-multiselect-option-senior----20-yrs-");
			await user.click(careerOption);
			await user.click(nextButton);

			const emailInput = screen.getByTestId("email-alerts-input");
			await user.type(emailInput, "test@domain.org");

			const termsCheckbox = screen.getByTestId("terms-checkbox");
			await user.click(termsCheckbox);

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			expect(createSubscription).toHaveBeenCalledWith({
				email: "test@domain.org",
				search_params: {
					category: "",
					deadline_after: "",
					deadline_before: "",
					limit: 20,
					max_amount: 0,
					min_amount: 0,
					offset: 0,
					query: "machine learning",
				},
			});
		});

		it("handles keywords with commas correctly", async () => {
			const { createSubscription } = await import("@/actions/grants");
			render(<SearchWizard />);

			await navigateToEmailStep(user, {
				fillEmailForm: true,
				keywords: "CRISPR-Cas9, single-cell RNA-seq, immunotherapy, precision medicine",
			});

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			expect(createSubscription).toHaveBeenCalledWith(
				expect.objectContaining({
					email: "test@example.com",
					search_params: expect.objectContaining({
						query: "CRISPR-Cas9 single-cell RNA-seq immunotherapy precision medicine",
					}),
				}),
			);
		});

		it("filters out empty keywords", async () => {
			const { createSubscription } = await import("@/actions/grants");
			render(<SearchWizard />);

			await navigateToEmailStep(user, {
				fillEmailForm: true,
				keywords: "CRISPR, , cancer research, ,gene editing  ,",
			});

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			expect(createSubscription).toHaveBeenCalledWith(
				expect.objectContaining({
					email: "test@example.com",
					search_params: expect.objectContaining({
						query: "CRISPR cancer research gene editing",
					}),
				}),
			);
		});
	});

	describe("Form data persistence", () => {
		it("preserves all form data during navigation", async () => {
			render(<SearchWizard />);

			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "proteomics");
			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);

			await user.click(nextButton);

			const institutionTrigger = screen.getByTestId("institution-location-multiselect-trigger");
			await user.click(institutionTrigger);
			const institutionOption = screen.getByTestId(
				"institution-location-multiselect-option-u-s--institution-with-foreign-component",
			);
			await user.click(institutionOption);
			await user.click(nextButton);

			const careerTrigger = screen.getByTestId("career-stage-multiselect-trigger");
			await user.click(careerTrigger);
			const careerOption = screen.getByTestId("career-stage-multiselect-option-mid-career--11-20-yrs-");
			await user.click(careerOption);
			await user.click(nextButton);

			const emailInput = screen.getByTestId("email-alerts-input");
			await user.type(emailInput, "test@research.edu");
			const termsCheckbox = screen.getByTestId("terms-checkbox");
			await user.click(termsCheckbox);

			const backButton = screen.getByTestId("wizard-back-button");
			await user.click(backButton);

			const careerDisplayText = screen.getByTestId("career-stage-multiselect-display-text");
			expect(careerDisplayText).toHaveTextContent("1 selected");

			await user.click(backButton);
			const institutionDisplayText = screen.getByTestId("institution-location-multiselect-display-text");
			expect(institutionDisplayText).toHaveTextContent("1 selected");

			await user.click(backButton);
			await user.click(backButton);

			expect(screen.getByTestId("keywords-textarea")).toHaveValue("proteomics");
		});
	});

	describe("Accessibility", () => {
		it("has proper heading hierarchy", async () => {
			render(<SearchWizard />);

			const keywordsTitle = screen.getByTestId("keywords-step-title");
			expect(keywordsTitle.tagName).toBe("H3");
		});

		it("has proper button types", () => {
			render(<SearchWizard />);

			expect(screen.getByTestId("wizard-back-button")).toHaveAttribute("type", "button");
			expect(screen.getByTestId("wizard-next-button")).toHaveAttribute("type", "button");
		});
	});

	describe("Edge cases", () => {
		it("handles empty form submission gracefully", async () => {
			render(<SearchWizard />);

			const nextButton = screen.getByTestId("wizard-next-button");
			expect(nextButton).toBeDisabled();
		});

		it("handles very long keywords input", async () => {
			render(<SearchWizard />);

			const longKeywords = `${"a".repeat(1000)}, ${"b".repeat(1000)}`;
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, longKeywords);

			const nextButton = screen.getByTestId("wizard-next-button");
			expect(nextButton).not.toBeDisabled();
		});

		it("handles special characters in keywords", async () => {
			const { createSubscription } = await import("@/actions/grants");
			render(<SearchWizard />);

			const specialKeywords = "CRISPR-Cas9, α-synuclein, β-amyloid, γ-secretase";
			await navigateToEmailStep(user, { fillEmailForm: true, keywords: specialKeywords });

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			expect(createSubscription).toHaveBeenCalledWith(
				expect.objectContaining({
					email: "test@example.com",
					search_params: expect.objectContaining({
						query: "CRISPR-Cas9 α-synuclein β-amyloid γ-secretase",
					}),
				}),
			);
		});
	});
});

async function navigateToEmailStep(
	user: ReturnType<typeof userEvent.setup>,
	options: Partial<{ fillEmailForm?: boolean; keywords: string }> = {},
) {
	const keywordsTextarea = screen.getByTestId("keywords-textarea");
	await user.type(keywordsTextarea, options.keywords ?? "CRISPR");

	const nextButton = screen.getByTestId("wizard-next-button");
	await user.click(nextButton);
	await user.click(nextButton);

	const institutionTrigger = screen.getByTestId("institution-location-multiselect-trigger");
	await user.click(institutionTrigger);
	const institutionOption = screen.getByTestId(
		"institution-location-multiselect-option-u-s--institution--no-foreign-component-",
	);
	await user.click(institutionOption);
	await user.click(nextButton);

	const careerTrigger = screen.getByTestId("career-stage-multiselect-trigger");
	await user.click(careerTrigger);
	const careerOption = screen.getByTestId("career-stage-multiselect-option-early-stage----10-yrs-");
	await user.click(careerOption);
	await user.click(nextButton);

	if (options.fillEmailForm) {
		const emailInput = screen.getByTestId("email-alerts-input");
		await user.type(emailInput, "test@example.com");

		const termsCheckbox = screen.getByTestId("terms-checkbox");
		await user.click(termsCheckbox);
	}
}
