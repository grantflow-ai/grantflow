import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Stepper } from "./stepper";

describe("Stepper", () => {
	const mockSteps = ["Personal Info", "Project Details", "Review"];
	const mockOnStepClick = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders all provided steps", () => {
		render(<Stepper currentStep={0} onStepClick={mockOnStepClick} steps={mockSteps} />);

		expect(screen.getByTestId("stepper")).toBeInTheDocument();
		expect(screen.getByText("Personal Info")).toBeInTheDocument();
		expect(screen.getByText("Project Details")).toBeInTheDocument();
		expect(screen.getByText("Review")).toBeInTheDocument();
	});

	it("allows clicking on steps", async () => {
		const user = userEvent.setup();
		render(<Stepper currentStep={0} onStepClick={mockOnStepClick} steps={mockSteps} />);

		const step1Button = screen.getByTestId("step-button-1");
		await user.click(step1Button);

		expect(mockOnStepClick).toHaveBeenCalledTimes(1);
		expect(mockOnStepClick).toHaveBeenCalledWith(1);
	});

	it("handles multiple step clicks", async () => {
		const user = userEvent.setup();
		render(<Stepper currentStep={0} onStepClick={mockOnStepClick} steps={mockSteps} />);

		
		await user.click(screen.getByTestId("step-button-2"));
		expect(mockOnStepClick).toHaveBeenCalledWith(2);

		await user.click(screen.getByTestId("step-button-0"));
		expect(mockOnStepClick).toHaveBeenCalledWith(0);

		expect(mockOnStepClick).toHaveBeenCalledTimes(2);
	});

	it("renders with variable number of steps", () => {
		const moreSteps = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"];

		render(<Stepper currentStep={2} onStepClick={mockOnStepClick} steps={moreSteps} />);

		moreSteps.forEach((step) => {
			expect(screen.getByText(step)).toBeInTheDocument();
		});

		
		for (let i = 0; i < moreSteps.length; i++) {
			expect(screen.getByTestId(`step-button-${i}`)).toBeInTheDocument();
		}
	});

	it("provides visual indicators for each step", () => {
		render(<Stepper currentStep={1} onStepClick={mockOnStepClick} steps={mockSteps} />);

		
		mockSteps.forEach((_, index) => {
			expect(screen.getByTestId(`step-indicator-${index}`)).toBeInTheDocument();
		});
	});

	it("renders correctly with zero steps", () => {
		render(<Stepper currentStep={0} onStepClick={mockOnStepClick} steps={[]} />);

		expect(screen.getByTestId("stepper")).toBeInTheDocument();
		
		expect(screen.queryByTestId("step-button-0")).not.toBeInTheDocument();
	});
});
