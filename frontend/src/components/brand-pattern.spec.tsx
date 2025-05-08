import { render, screen } from "@testing-library/react";
import { BrandPattern } from "@/components/brand-pattern";

describe("BrandPattern Component", () => {
	it("renders without crashing", () => {
		render(<BrandPattern data-testid="brand-pattern" />);
		expect(screen.getByTestId("brand-pattern")).toBeInTheDocument();
	});

	it("applies default strokeWidth when not specified", () => {
		render(<BrandPattern data-testid="brand-pattern" />);
		const svg = screen.getByTestId("brand-pattern");
		const path = svg.querySelector("path");
		expect(path).toHaveAttribute("stroke-width", "0.3");
	});

	it("applies custom strokeWidth when provided", () => {
		render(<BrandPattern data-testid="brand-pattern" strokeWidth="0.5" />);
		const svg = screen.getByTestId("brand-pattern");
		const path = svg.querySelector("path");
		expect(path).toHaveAttribute("stroke-width", "0.5");
	});

	it("forwards additional props to the SVG element", () => {
		render(<BrandPattern aria-label="decorative pattern" className="custom-class" data-testid="brand-pattern" />);
		const svg = screen.getByTestId("brand-pattern");
		expect(svg).toHaveAttribute("aria-label", "decorative pattern");
		expect(svg).toHaveClass("custom-class");
	});

	it("has the correct SVG attributes", () => {
		render(<BrandPattern data-testid="brand-pattern" />);
		const svg = screen.getByTestId("brand-pattern");
		expect(svg).toHaveAttribute("width", "846");
		expect(svg).toHaveAttribute("height", "491");
		expect(svg).toHaveAttribute("viewBox", "0 0 846 491");
		expect(svg).toHaveAttribute("preserveAspectRatio", "none");
	});
});
