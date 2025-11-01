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
		const currentLabel = screen.getByText(WIZARD_STEPS[1]);
		expect(currentLabel).toHaveClass("text-primary");
	});

	it("shows previous step label as completed color", () => {
		render(<ProgressBar currentStep={2} />);
		const previousLabel = screen.getByText(WIZARD_STEPS[0]);
		expect(previousLabel).toHaveClass("text-app-dark-blue");
	});

	it("shows future step label as inactive color", () => {
		render(<ProgressBar currentStep={1} />);
		const futureLabel = screen.getByText(WIZARD_STEPS[1]);
		expect(futureLabel).toHaveClass("text-app-gray-400");
	});
});
