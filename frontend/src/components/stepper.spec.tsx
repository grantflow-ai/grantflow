import { fireEvent, render, screen } from "@testing-library/react";
import { Stepper } from "./stepper";

describe("Stepper", () => {
	const mockSteps = ["Personal Info", "Project Details", "Review"];
	const mockOnStepClick = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders all steps correctly", () => {
		render(<Stepper currentStep={0} onStepClick={mockOnStepClick} steps={mockSteps} />);

		expect(screen.getByTestId("stepper")).toBeInTheDocument();
		expect(screen.getByText("Personal Info")).toBeInTheDocument();
		expect(screen.getByText("Project Details")).toBeInTheDocument();
		expect(screen.getByText("Review")).toBeInTheDocument();
	});

	it("highlights the current step", () => {
		render(<Stepper currentStep={1} onStepClick={mockOnStepClick} steps={mockSteps} />);

		const currentStepText = screen.getByText("Project Details");
		expect(currentStepText).toHaveClass("font-bold");
		expect(currentStepText).toHaveClass("text-primary");

		const previousStepText = screen.getByText("Personal Info");
		expect(previousStepText).not.toHaveClass("font-bold");
		expect(previousStepText).toHaveClass("text-muted-foreground");

		const nextStepText = screen.getByText("Review");
		expect(nextStepText).not.toHaveClass("font-bold");
		expect(nextStepText).toHaveClass("text-muted-foreground");
	});

	it("shows completed and current steps with primary color indicator", () => {
		render(<Stepper currentStep={1} onStepClick={mockOnStepClick} steps={mockSteps} />);

		const step0Indicator = screen.getByTestId("step-indicator-0");
		const step1Indicator = screen.getByTestId("step-indicator-1");
		const step2Indicator = screen.getByTestId("step-indicator-2");

		expect(step0Indicator).toHaveClass("bg-primary");
		expect(step1Indicator).toHaveClass("bg-primary");
		expect(step2Indicator).toHaveClass("bg-muted");
	});

	it("calls onStepClick with the correct step index when clicked", () => {
		render(<Stepper currentStep={0} onStepClick={mockOnStepClick} steps={mockSteps} />);

		const step1Button = screen.getByTestId("step-button-1");
		fireEvent.click(step1Button);

		expect(mockOnStepClick).toHaveBeenCalledTimes(1);
		expect(mockOnStepClick).toHaveBeenCalledWith(1);
	});

	it("handles a different number of steps", () => {
		const moreSteps = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"];

		render(<Stepper currentStep={2} onStepClick={mockOnStepClick} steps={moreSteps} />);

		expect(screen.getByText("Step 1")).toBeInTheDocument();
		expect(screen.getByText("Step 2")).toBeInTheDocument();
		expect(screen.getByText("Step 3")).toBeInTheDocument();
		expect(screen.getByText("Step 4")).toBeInTheDocument();
		expect(screen.getByText("Step 5")).toBeInTheDocument();

		const step0Indicator = screen.getByTestId("step-indicator-0");
		const step1Indicator = screen.getByTestId("step-indicator-1");
		const step2Indicator = screen.getByTestId("step-indicator-2");
		const step3Indicator = screen.getByTestId("step-indicator-3");
		const step4Indicator = screen.getByTestId("step-indicator-4");

		expect(step0Indicator).toHaveClass("bg-primary");
		expect(step1Indicator).toHaveClass("bg-primary");
		expect(step2Indicator).toHaveClass("bg-primary");
		expect(step3Indicator).toHaveClass("bg-muted");
		expect(step4Indicator).toHaveClass("bg-muted");
	});
});
