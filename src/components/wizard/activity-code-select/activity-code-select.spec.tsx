import { MockPointerEvent } from "::testing/global-mocks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ActivityCodeSelect, SupportedActivityCodes } from "./activity-code-select";

describe("ActivityCodeSelect", () => {
	it("renders the component", () => {
		render(<ActivityCodeSelect />);

		const container = screen.getByTestId("activity-code-select-container");
		expect(container).toBeInTheDocument();

		const placeholder = screen.getByTestId("activity-code-select-placeholder");
		expect(placeholder).toBeInTheDocument();
		expect(placeholder.textContent).toBe("Select an NIH Activity Code");
	});

	it("renders all the supported activity codes", async () => {
		render(<ActivityCodeSelect />);

		const trigger = screen.getByRole("combobox");
		fireEvent.pointerDown(
			trigger,
			new MockPointerEvent("pointerdown", {
				ctrlKey: false,
				button: 0,
			}),
		);

		for (const code of SupportedActivityCodes) {
			await waitFor(() => {
				const item = screen.getByTestId(`activity-code-select-item-${code}`);
				expect(item).toBeInTheDocument();
			});
		}
	});

	it("selects an activity code", async () => {
		render(<ActivityCodeSelect />);

		const trigger = screen.getByRole("combobox");
		fireEvent.pointerDown(
			trigger,
			new MockPointerEvent("pointerdown", {
				ctrlKey: false,
				button: 0,
			}),
		);

		await waitFor(() => {
			expect(screen.getByTestId("activity-code-select-item-R01")).toBeInTheDocument();
		});
		const item = screen.getByTestId("activity-code-select-item-R01");
		fireEvent.click(item);

		await waitFor(() => {
			expect(screen.getByTestId("activity-code-select-placeholder")).toBeInTheDocument();
		});
		const selectedValue = screen.getByTestId("activity-code-select-placeholder");
		expect(selectedValue.textContent).toBe("Select an NIH Activity Code");
	});
});
