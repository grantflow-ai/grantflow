import { render, screen } from "@testing-library/react";
import { PROGRESS_BAR_STEPS } from "@/constants";
import { ProgressBar } from "./progress-bar";

describe("ProgressBar", () => {
	expect(screen.getAllByTestId("progress-bar-step")).toHaveLength(PROGRESS_BAR_STEPS.length);

	it("renders the correct number of steps", () => {
		render(<ProgressBar currentStep={1} />);
		// Each ProgressBarStep renders a dot/circle
		const circles = screen.getAllByRole("presentation");
		expect(circles.length).toBe(PROGRESS_BAR_STEPS.length);
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
