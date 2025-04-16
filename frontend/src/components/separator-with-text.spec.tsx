import { render, screen } from "@testing-library/react";
import { SeparatorWithText } from "./separator-with-text";

describe("SeparatorWithText", () => {
	it("renders with the provided text", () => {
		render(<SeparatorWithText text="OR" />);

		expect(screen.getByTestId("separator")).toBeInTheDocument();
		expect(screen.getByTestId("separator-text")).toHaveTextContent("OR");
	});

	it("renders with a different text", () => {
		render(<SeparatorWithText text="Continue with" />);

		expect(screen.getByTestId("separator-text")).toHaveTextContent("Continue with");
	});

	it("has the correct styling", () => {
		render(<SeparatorWithText text="Test" />);

		const separator = screen.getByTestId("separator");
		expect(separator).toHaveClass("relative");

		const text = screen.getByTestId("separator-text");
		expect(text).toHaveClass("mx-3");
		expect(text).toHaveClass("text-zinc-500");
	});
});
