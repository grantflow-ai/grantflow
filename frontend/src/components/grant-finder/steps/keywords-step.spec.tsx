import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeywordsStep } from "./keywords-step";

describe("KeywordsStep", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	const mockFormData = {
		activityCodes: [],
		agreeToTerms: false,
		agreeToUpdates: false,
		careerStage: [],
		email: "",
		institutionLocation: [],
		keywords: "",
	};

	it("should render the title and description", () => {
		const setFormData = vi.fn();
		render(<KeywordsStep formData={mockFormData} setFormData={setFormData} />);

		expect(screen.getByTestId("keywords-step-title")).toHaveTextContent("Keywords");
		expect(screen.getByTestId("keywords-step-description")).toHaveTextContent(
			"Enter one or more keywords that describe the scientific topics or methods your next projects will target, e.g., CRISPR, neuro-oncology, single-cell RNA-seq. Add as many as you like. We'll search NIH Funding Opportunity Announcements (FOAs) whose titles or descriptions contain any of these terms.",
		);
	});

	it("should display the initial value from formData in the textarea", () => {
		const setFormData = vi.fn();
		const formDataWithValues = { ...mockFormData, keywords: "Initial keywords" };
		render(<KeywordsStep formData={formDataWithValues} setFormData={setFormData} />);

		const textarea = screen.getByTestId("keywords-textarea");
		expect(textarea).toHaveValue("Initial keywords");
	});

	it("should call setFormData when the textarea value changes", () => {
		const setFormData = vi.fn();
		render(<KeywordsStep formData={mockFormData} setFormData={setFormData} />);

		const textarea = screen.getByTestId("keywords-textarea");
		fireEvent.change(textarea, { target: { value: "New keywords" } });

		expect(setFormData).toHaveBeenCalledWith({
			...mockFormData,
			keywords: "New keywords",
		});
	});
});
