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

		
		expect(svg).toHaveAttribute("viewBox");
		
		expect(svg).toHaveAttribute("preserveAspectRatio");
		
		expect(svg.querySelector("path")).toBeInTheDocument();
	});
});
