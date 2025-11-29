import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { WIZARD_STEPS } from "@/constants";
import { ProgressBar } from "./progress-bar";

describe.sequential("ProgressBar", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders the correct number of steps", () => {
		render(<ProgressBar currentStep={1} />);

		const labels = screen.getAllByRole("heading", { level: 5 });
		expect(labels.length).toBe(WIZARD_STEPS.length);
	});

	it("displays all step labels", () => {
		render(<ProgressBar currentStep={1} />);
		WIZARD_STEPS.forEach((label) => {
			expect(screen.getByText(label)).toBeInTheDocument();
		});
	});

	it("highlights current step label", () => {
		render(<ProgressBar currentStep={2} />);
		const [, currentStepLabel] = WIZARD_STEPS;
		if (!currentStepLabel) throw new Error("Expected WIZARD_STEPS[1] to be defined");
		const currentLabel = screen.getByText(currentStepLabel);
		expect(currentLabel).toHaveClass("text-primary");
	});

	it("shows previous step label as completed color", () => {
		render(<ProgressBar currentStep={2} />);
		const [previousStepLabel] = WIZARD_STEPS;
		if (!previousStepLabel) throw new Error("Expected WIZARD_STEPS[0] to be defined");
		const previousLabel = screen.getByText(previousStepLabel);
		expect(previousLabel).toHaveClass("text-app-dark-blue");
	});

	it("shows future step label as inactive color", () => {
		render(<ProgressBar currentStep={1} />);
		const [, futureStepLabel] = WIZARD_STEPS;
		if (!futureStepLabel) throw new Error("Expected WIZARD_STEPS[1] to be defined");
		const futureLabel = screen.getByText(futureStepLabel);
		expect(futureLabel).toHaveClass("text-app-gray-400");
	});
});
