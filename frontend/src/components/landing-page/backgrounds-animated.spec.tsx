import { render, screen } from "@testing-library/react";

import { AnimatedGradientBackground } from "@/components/landing-page/backgrounds-animated";

describe("AnimatedGradientBackground", () => {
	it("renders with correct default classes", () => {
		render(<AnimatedGradientBackground data-testid="animated-background" />);
		const element = screen.getByTestId("animated-background");
		expect(element.className).toContain("opacity-70");
		expect(element.className).toContain("relative");
	});

	it("accepts and applies custom className", () => {
		render(<AnimatedGradientBackground className="custom-class" data-testid="animated-background" />);
		const element = screen.getByTestId("animated-background");
		expect(element.className).toContain("custom-class");
		expect(element.className).toContain("opacity-70");
	});

	it("renders without crashing", () => {
		expect(() => {
			render(<AnimatedGradientBackground />);
		}).not.toThrow();
	});
});
