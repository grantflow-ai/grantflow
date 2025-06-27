import { render, screen } from "@testing-library/react";

import { GradientBackground } from "@/components/landing-page/backgrounds";

describe("Background Components", () => {
	describe("GradientBackground Component", () => {
		it("renders the component", () => {
			render(<GradientBackground data-testid="gradient-bg" />);
			const element = screen.getByTestId("gradient-bg");

			expect(element).toBeInTheDocument();
		});

		it("renders with different positions correctly", () => {
			const { rerender } = render(
				<GradientBackground data-testid="original-gradient-bg" position="bottom-left" />,
			);

			let element = screen.getByTestId("original-gradient-bg");
			const style = globalThis.getComputedStyle(element);
			expect(style.background).toContain("radial-gradient");
			expect(style.background).toContain("80%");

			rerender(<GradientBackground data-testid="original-gradient-bg" position="bottom-center" />);
			element = screen.getByTestId("original-gradient-bg");
			const updatedStyle = globalThis.getComputedStyle(element);
			expect(updatedStyle.background).toContain("radial-gradient");
			expect(updatedStyle.background).toContain("0%");
		});
	});
});
