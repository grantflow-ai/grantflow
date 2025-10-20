import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityCodesStep } from "./activity-codes-step";

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
			<option value="R01">R01</option>
			<option value="R21">R21</option>
		</select>
	),
}));

describe("ActivityCodesStep", () => {
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
		render(<ActivityCodesStep formData={mockFormData} setFormData={setFormData} />);

		expect(screen.getByTestId("activity-codes-step-title")).toHaveTextContent("NIH Activity Codes");
		expect(screen.getByTestId("activity-codes-step-description")).toHaveTextContent(
			"Select one or more grant mechanisms, or leave this blank to scan all FOAs.",
		);
	});

	it("should pass initial form data to the MultiSelect component", () => {
		const setFormData = vi.fn();
		const formDataWithValues = { ...mockFormData, activityCodes: ["R01"] };
		render(<ActivityCodesStep formData={formDataWithValues} setFormData={setFormData} />);

		const multiselect = screen.getByTestId("activity-codes-multiselect");
		expect(multiselect).toHaveValue(["R01"]);
	});

	it("should call setFormData when the selection changes", async () => {
		const setFormData = vi.fn();
		render(<ActivityCodesStep formData={mockFormData} setFormData={setFormData} />);
		const user = userEvent.setup();

		const multiselect = screen.getByTestId("activity-codes-multiselect");
		await user.selectOptions(multiselect, ["R21"]);

		expect(setFormData).toHaveBeenCalledWith({
			...mockFormData,
			activityCodes: ["R21"],
		});
	});
});
