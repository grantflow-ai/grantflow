import { render, screen } from "@testing-library/react";
import { Greeting } from "./greeting";

describe("greeting component", () => {
	it("should srender correctly", () => {
		render(<Greeting name="world" />);

		const headingElement = screen.getByRole("heading", { name: /hello, world/i });
		expect(headingElement).toBeInTheDocument();
	});
});
