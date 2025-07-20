import { cleanup, render } from "@testing-library/react";
import { afterEach } from "vitest";

import { AnimatedGradientBackground } from "@/components/landing-page/backgrounds-animated";

afterEach(() => {
	cleanup();
});

describe("AnimatedGradientBackground", () => {
	it("renders with correct default classes", () => {
		const { container } = render(<AnimatedGradientBackground data-testid="animated-background" />);
		const element = container.querySelector('[data-testid="animated-background"]');
		expect(element?.className).toContain("opacity-70");
		expect(element?.className).toContain("relative");
	});

	it("accepts and applies custom className", () => {
		const { container } = render(
			<AnimatedGradientBackground className="custom-class" data-testid="animated-background" />,
		);
		const element = container.querySelector('[data-testid="animated-background"]');
		expect(element?.className).toContain("custom-class");
		expect(element?.className).toContain("opacity-70");
	});

	it("renders without crashing", () => {
		const { container } = render(<AnimatedGradientBackground data-testid="animated-background-test" />);
		const element = container.querySelector('[data-testid="animated-background-test"]');
		expect(element).toBeInTheDocument();
	});
});
