import { render, screen } from "@testing-library/react";

import { Logo } from "@/components/branding/logo";

describe("Logo Component", () => {
	it("renders logo SVG", () => {
		render(<Logo />);
		const logoElement = screen.getByTestId("logo");
		expect(logoElement).toBeInTheDocument();
		expect(logoElement.tagName).toBe("svg");
	});

	it("has accessible attributes", () => {
		render(<Logo />);
		const logoElement = screen.getByTestId("logo");
		expect(logoElement).toHaveAttribute("role", "img");
		expect(logoElement).toHaveAttribute("aria-label");
	});
});
