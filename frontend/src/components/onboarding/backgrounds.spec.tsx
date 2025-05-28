import { render, screen } from "@testing-library/react";

import {
	OnboardingGradientBackgroundBottom,
	OnboardingGradientBackgroundTop,
	StackedHighlight,
} from "@/components/onboarding/backgrounds";

describe("Onboarding Background Components", () => {
	describe("OnboardingGradientBackgroundBottom", () => {
		it("renders an svg", () => {
			render(<OnboardingGradientBackgroundBottom />);
			const element = screen.getByTestId("onboarding-gradient-background-bottom");

			expect(element).toBeInTheDocument();
			expect(element.tagName).toBe("svg");
		});

		it("forwards additional props", () => {
			render(<OnboardingGradientBackgroundBottom aria-label="Background" className="custom-class" />);
			const element = screen.getByTestId("onboarding-gradient-background-bottom");

			expect(element).toHaveAttribute("aria-label", "Background");
			expect(element).toHaveClass("custom-class");
		});
	});

	describe("OnboardingGradientBackgroundTop", () => {
		it("renders a svg", () => {
			render(<OnboardingGradientBackgroundTop />);
			const element = screen.getByTestId("onboarding-gradient-background-top");

			expect(element).toBeInTheDocument();
			expect(element.tagName).toBe("svg");
		});

		it("forwards additional props", () => {
			render(<OnboardingGradientBackgroundTop aria-label="Top Background" className="custom-class" />);
			const element = screen.getByTestId("onboarding-gradient-background-top");

			expect(element).toHaveAttribute("aria-label", "Top Background");
			expect(element).toHaveClass("custom-class");
		});
	});

	describe("StackedHighlight", () => {
		it("renders a svg", () => {
			render(<StackedHighlight />);
			const element = screen.getByTestId("stacked-highlight");

			expect(element).toBeInTheDocument();
			expect(element.tagName).toBe("svg");
		});

		it("forwards additional props", () => {
			render(
				<StackedHighlight aria-label="Highlight" className="custom-class" data-testid="stacked-highlight" />,
			);
			const element = screen.getByTestId("stacked-highlight");

			expect(element).toHaveAttribute("aria-label", "Highlight");
			expect(element).toHaveClass("custom-class");
		});
	});
});
