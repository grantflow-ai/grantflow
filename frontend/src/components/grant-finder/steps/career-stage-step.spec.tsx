import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CareerStageStep } from "./career-stage-step";

vi.mock("@/components/app/forms/multi-select", () => ({
	MultiSelect: ({
		"data-testid": testId,
		onValueChange,
		value,
	}: {
		"data-testid": string;
		onValueChange: (value: string[]) => void;
		value: string[];
	}) => (
		<select
			data-testid={testId}
			multiple
			onChange={(e) => {
				const options = Array.from(e.target.selectedOptions, (option) => option.value);
				onValueChange(options);
			}}
			value={value}
		>
			<option value="Early-stage (≤ 10 yrs)">Early-stage (≤ 10 yrs)</option>
			<option value="Mid-career (11–20 yrs)">Mid-career (11–20 yrs)</option>
		</select>
	),
}));

describe("CareerStageStep", () => {
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

	it("should render the title, description, and note", () => {
		const setFormData = vi.fn();
		render(<CareerStageStep formData={mockFormData} setFormData={setFormData} />);

		expect(screen.getByTestId("career-stage-step-title")).toHaveTextContent("Career Stage");
		expect(screen.getByTestId("career-stage-step-description")).toHaveTextContent(
			"How many years has it been since you earned your PhD?",
		);
		expect(screen.getByTestId("career-stage-step-note")).toHaveTextContent(
			"Note: Certain FOAs limit eligibility to Early-Stage Investigators. Choose the option that matches your status.",
		);
	});

	it("should pass initial form data to the MultiSelect component", () => {
		const setFormData = vi.fn();
		const formDataWithValues = { ...mockFormData, careerStage: ["Early-stage (≤ 10 yrs)"] };
		render(<CareerStageStep formData={formDataWithValues} setFormData={setFormData} />);

		const multiselect = screen.getByTestId("career-stage-multiselect");
		expect(multiselect).toHaveValue(["Early-stage (≤ 10 yrs)"]);
	});

	it("should call setFormData when the selection changes", async () => {
		const setFormData = vi.fn();
		render(<CareerStageStep formData={mockFormData} setFormData={setFormData} />);
		const user = userEvent.setup();

		const multiselect = screen.getByTestId("career-stage-multiselect");
		await user.selectOptions(multiselect, ["Mid-career (11–20 yrs)"]);

		expect(setFormData).toHaveBeenCalledWith({
			...mockFormData,
			careerStage: ["Mid-career (11–20 yrs)"],
		});
	});
});
