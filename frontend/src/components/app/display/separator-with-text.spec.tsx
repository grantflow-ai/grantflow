import { render, screen } from "@testing-library/react";

import { SeparatorWithText } from "./separator-with-text";

describe("SeparatorWithText", () => {
	it("renders with the provided text", () => {
		render(<SeparatorWithText text="OR" />);

		expect(screen.getByTestId("separator")).toBeInTheDocument();
		expect(screen.getByTestId("separator-text")).toHaveTextContent("OR");
	});

	it("displays different text content", () => {
		render(<SeparatorWithText text="Continue with" />);

		expect(screen.getByTestId("separator-text")).toHaveTextContent("Continue with");
	});
});
