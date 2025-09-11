import { cleanup, render } from "@testing-library/react";
import { afterEach, describe } from "vitest";

import { Logo } from "./logo";

describe.sequential("Logo Component", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders logo SVG", () => {
		const { container } = render(<Logo />);
		const logoElement = container.querySelector('[data-testid="logo"]');
		expect(logoElement).toBeInTheDocument();
		expect(logoElement?.tagName).toBe("svg");
	});

	it("has accessible attributes", () => {
		const { container } = render(<Logo />);
		const logoElement = container.querySelector('[data-testid="logo"]');
		expect(logoElement).toHaveAttribute("role", "img");
		expect(logoElement).toHaveAttribute("aria-label");
	});
});
