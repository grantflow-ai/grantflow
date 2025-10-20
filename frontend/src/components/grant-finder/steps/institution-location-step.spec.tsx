import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstitutionLocationStep } from "./institution-location-step";

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
			<option value="U.S. institution (no foreign component)">U.S. institution (no foreign component)</option>
			<option value="Non-U.S. (foreign) institution">Non-U.S. (foreign) institution</option>
		</select>
	),
}));

describe("InstitutionLocationStep", () => {
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
		render(<InstitutionLocationStep formData={mockFormData} setFormData={setFormData} />);

		expect(screen.getByTestId("institution-location-step-title")).toHaveTextContent("Institution Location");
		expect(screen.getByTestId("institution-location-step-description")).toHaveTextContent(
			"Tell us where the grant will be administered",
		);
	});

	it("should pass initial form data to the MultiSelect component", () => {
		const setFormData = vi.fn();
		const formDataWithValues = {
			...mockFormData,
			institutionLocation: ["U.S. institution (no foreign component)"],
		};
		render(<InstitutionLocationStep formData={formDataWithValues} setFormData={setFormData} />);

		const multiselect = screen.getByTestId("institution-location-multiselect");
		expect(multiselect).toHaveValue(["U.S. institution (no foreign component)"]);
	});

	it("should call setFormData when the selection changes", async () => {
		const setFormData = vi.fn();
		render(<InstitutionLocationStep formData={mockFormData} setFormData={setFormData} />);
		const user = userEvent.setup();

		const multiselect = screen.getByTestId("institution-location-multiselect");
		await user.selectOptions(multiselect, ["Non-U.S. (foreign) institution"]);

		expect(setFormData).toHaveBeenCalledWith({
			...mockFormData,
			institutionLocation: ["Non-U.S. (foreign) institution"],
		});
	});
});
