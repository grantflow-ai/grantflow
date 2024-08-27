import { render, screen } from "@testing-library/react";
import { Logo } from "./logo";

describe("Logo Component", () => {
	it("renders without crashing", () => {
		render(<Logo />);
		const logoElement = screen.getByTestId("logo");
		expect(logoElement).toBeDefined();
	});

	it("has correct default dimensions", () => {
		render(<Logo />);
		const logoElement = screen.getByTestId("logo");
		expect(logoElement).toHaveAttribute("width", "72");
		expect(logoElement).toHaveAttribute("height", "72");
	});

	it("accepts custom dimensions", () => {
		render(<Logo width={100} height={100} />);
		const logoElement = screen.getByTestId("logo");
		expect(logoElement).toHaveAttribute("width", "100");
		expect(logoElement).toHaveAttribute("height", "100");
	});
});
