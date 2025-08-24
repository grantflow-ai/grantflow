import { cleanup, render } from "@testing-library/react";
import { afterEach, describe } from "vitest";

import { BrandPattern } from "./brand-pattern";

describe.sequential("BrandPattern Component", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders SVG element", () => {
		const { container } = render(<BrandPattern data-testid="brand-pattern" />);
		const svg = container.querySelector('[data-testid="brand-pattern"]');
		expect(svg).toBeInTheDocument();
		expect(svg?.tagName).toBe("svg");
	});

	it("forwards props to SVG element", () => {
		const { container } = render(
			<BrandPattern
				aria-label="decorative pattern"
				className="custom-class"
				data-testid="brand-pattern"
				id="test-pattern"
			/>,
		);

		const svg = container.querySelector('[data-testid="brand-pattern"]');
		expect(svg).toHaveAttribute("aria-label", "decorative pattern");
		expect(svg).toHaveClass("custom-class");
		expect(svg).toHaveAttribute("id", "test-pattern");
	});

	it("renders as decorative pattern", () => {
		const { container } = render(<BrandPattern data-testid="brand-pattern" />);
		const svg = container.querySelector('[data-testid="brand-pattern"]');

		expect(svg).toHaveAttribute("viewBox");

		expect(svg).toHaveAttribute("preserveAspectRatio");

		expect(svg?.querySelector("path")).toBeInTheDocument();
	});
});
