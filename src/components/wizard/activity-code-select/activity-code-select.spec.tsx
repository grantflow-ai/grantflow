import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ActivityCodeSelect, SupportedActivityCodes } from "./activity-code-select";

// see: https://stackoverflow.com/questions/78561620/need-help-unit-testing-select-from-shadcn-ui
class MockPointerEvent extends Event {
	button: number | undefined;
	ctrlKey: boolean | undefined;

	constructor(type: string, props: EventInit & { button?: number | null; ctrlKey?: boolean | null }) {
		super(type, props);
		if (props.button !== null) {
			this.button = props.button;
		}
		if (props.ctrlKey !== null) {
			this.ctrlKey = props.ctrlKey;
		}
	}
}

const mockScrollIntoView = vi.fn();
const mockHasPointerCapture = vi.fn();
const mockReleasePointerCapture = vi.fn();

describe("ActivityCodeSelect", () => {
	beforeEach(() => {
		window.PointerEvent = MockPointerEvent as any;
		window.HTMLElement.prototype.hasPointerCapture = mockHasPointerCapture;
		window.HTMLElement.prototype.releasePointerCapture = mockReleasePointerCapture;
		window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;
	});
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
