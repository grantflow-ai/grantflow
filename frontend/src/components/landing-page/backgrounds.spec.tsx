import { render, screen } from "@testing-library/react";

import {
	GradientBackground,
	PatternedBackground,
	PatternedBackgroundMobile,
} from "@/components/landing-page/backgrounds";

describe("Background Components", () => {
	describe("GradientBackground Component", () => {
		it("renders with correct default position class", () => {
			render(<GradientBackground data-testid="gradient-bg" />);
			const element = screen.getByTestId("gradient-bg");

			expect(element.className).toContain("opacity-70");
		});

		it("accepts and applies custom className", () => {
			render(<GradientBackground className="custom-class" data-testid="gradient-bg" />);
			const element = screen.getByTestId("gradient-bg");

			expect(element.className).toContain("custom-class");
			expect(element.className).toContain("opacity-70");
		});

		it("renders with different positions correctly", () => {
			const { rerender } = render(
				<GradientBackground data-testid="original-gradient-bg" position="bottom-left" />,
			);

			let element = screen.getByTestId("original-gradient-bg");
			const style = globalThis.getComputedStyle(element);
			expect(style.background).toContain("radial-gradient");
			expect(style.background).toContain("80%");

			rerender(<GradientBackground data-testid="original-gradient-bg" position="top-right" />);
			element = screen.getByTestId("original-gradient-bg");
			const updatedStyle = globalThis.getComputedStyle(element);
			expect(updatedStyle.background).toContain("radial-gradient");
			expect(updatedStyle.background).toContain("0%");
		});
	});

	describe("PatternedBackground Component", () => {
		it("renders an SVG element", () => {
			render(<PatternedBackground data-testid="patterned-bg" />);
			const element = screen.getByTestId("patterned-bg");

			expect(element.tagName.toLowerCase()).toBe("svg");
		});

		it("has the correct size class", () => {
			render(<PatternedBackground data-testid="patterned-bg" />);
			const element = screen.getByTestId("patterned-bg");

			expect(element).toHaveClass("size-full");
		});

		it("has the correct viewBox attribute", () => {
			render(<PatternedBackground data-testid="patterned-bg" />);
			const element = screen.getByTestId("patterned-bg");

			expect(element.getAttribute("viewBox")).toBe("0 0 1440 972");
		});

		it("preserves aspect ratio correctly", () => {
			render(<PatternedBackground data-testid="patterned-bg" />);
			const element = screen.getByTestId("patterned-bg");

			expect(element.getAttribute("preserveAspectRatio")).toBe("xMidYMid slice");
		});

		it("contains path elements for the pattern", () => {
			render(<PatternedBackground data-testid="patterned-bg" />);
			const element = screen.getByTestId("patterned-bg");
			const paths = element.querySelectorAll("path");

			expect(paths.length).toBeGreaterThan(0);

			const [firstPath] = paths;
			expect(firstPath.getAttribute("stroke")).toBe("#1E13F8");
		});

		it("accepts and passes through additional props", () => {
			render(<PatternedBackground aria-label="Background pattern" data-testid="patterned-bg" />);
			const element = screen.getByTestId("patterned-bg");

			expect(element.getAttribute("aria-label")).toBe("Background pattern");
		});
	});

	describe("PatternedBackgroundMobile Component", () => {
		it("renders an SVG element", () => {
			render(<PatternedBackgroundMobile data-testid="patterned-bg-mobile" />);
			const element = screen.getByTestId("patterned-bg-mobile");

			expect(element.tagName.toLowerCase()).toBe("svg");
		});

		it("has the correct size class", () => {
			render(<PatternedBackgroundMobile data-testid="patterned-bg-mobile" />);
			const element = screen.getByTestId("patterned-bg-mobile");

			expect(element).toHaveClass("size-full");
		});

		it("has the correct viewBox attribute", () => {
			render(<PatternedBackgroundMobile data-testid="patterned-bg-mobile" />);
			const element = screen.getByTestId("patterned-bg-mobile");

			expect(element.getAttribute("viewBox")).toBe("0 0 391 1446");
		});

		it("preserves aspect ratio correctly", () => {
			render(<PatternedBackgroundMobile data-testid="patterned-bg-mobile" />);
			const element = screen.getByTestId("patterned-bg-mobile");

			expect(element.getAttribute("preserveAspectRatio")).toBe("xMidYMid slice");
		});

		it("contains path elements for the pattern", () => {
			render(<PatternedBackgroundMobile data-testid="patterned-bg-mobile" />);
			const element = screen.getByTestId("patterned-bg-mobile");
			const paths = element.querySelectorAll("path");

			expect(paths.length).toBeGreaterThan(0);

			const [firstPath] = paths;
			expect(firstPath.getAttribute("stroke")).toBe("#1E13F8");
		});

		it("accepts and passes through additional props", () => {
			render(
				<PatternedBackgroundMobile aria-label="Mobile background pattern" data-testid="patterned-bg-mobile" />,
			);
			const element = screen.getByTestId("patterned-bg-mobile");

			expect(element.getAttribute("aria-label")).toBe("Mobile background pattern");
		});
	});
});
