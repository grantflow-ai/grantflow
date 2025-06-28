import { render, screen } from "@testing-library/react";

import { BrandPattern } from "@/components/branding/brand-pattern";

describe("BrandPattern Component", () => {
	it("renders SVG element", () => {
		render(<BrandPattern data-testid="brand-pattern" />);
		const svg = screen.getByTestId("brand-pattern");
		expect(svg).toBeInTheDocument();
		expect(svg.tagName).toBe("svg");
	});

	it("forwards props to SVG element", () => {
		render(
			<BrandPattern
				aria-label="decorative pattern"
				className="custom-class"
				data-testid="brand-pattern"
				id="test-pattern"
			/>,
		);

		const svg = screen.getByTestId("brand-pattern");
		expect(svg).toHaveAttribute("aria-label", "decorative pattern");
		expect(svg).toHaveClass("custom-class");
		expect(svg).toHaveAttribute("id", "test-pattern");
	});

	it("renders as decorative pattern", () => {
		render(<BrandPattern data-testid="brand-pattern" />);
		const svg = screen.getByTestId("brand-pattern");

		// SVG should have viewBox for proper scaling
		expect(svg).toHaveAttribute("viewBox");
		// SVG should have preserveAspectRatio for responsive behavior
		expect(svg).toHaveAttribute("preserveAspectRatio");
		// Should contain path elements for the pattern
		expect(svg.querySelector("path")).toBeInTheDocument();
	});
});
