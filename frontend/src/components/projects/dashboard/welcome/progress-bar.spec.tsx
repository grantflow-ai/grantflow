import { render, screen } from "@testing-library/react";
import { PROGRESS_BAR_STEPS } from "@/constants";
import { ProgressBar } from "./progress-bar";

describe("ProgressBar", () => {
	it("renders the correct number of steps", () => {
		render(<ProgressBar currentStep={1} />);
		// Check for step labels
		const labels = screen.getAllByRole("heading", { level: 5 });
		expect(labels.length).toBe(PROGRESS_BAR_STEPS.length);
	});

	it("displays all step labels", () => {
		render(<ProgressBar currentStep={1} />);
		PROGRESS_BAR_STEPS.forEach((label) => {
			expect(screen.getByText(label)).toBeInTheDocument();
		});
	});

	it("highlights current step label", () => {
		render(<ProgressBar currentStep={2} />);
		const currentLabel = screen.getByText(PROGRESS_BAR_STEPS[1]);
		expect(currentLabel).toHaveClass("text-primary");
	});

	it("shows previous step label as completed color", () => {
		render(<ProgressBar currentStep={2} />);
		const previousLabel = screen.getByText(PROGRESS_BAR_STEPS[0]);
		expect(previousLabel).toHaveClass("text-app-dark-blue");
	});

	it("shows future step label as inactive color", () => {
		render(<ProgressBar currentStep={1} />);
		const futureLabel = screen.getByText(PROGRESS_BAR_STEPS[1]);
		expect(futureLabel).toHaveClass("text-app-gray-400");
	});
});
