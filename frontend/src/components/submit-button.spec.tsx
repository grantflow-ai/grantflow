import { render, screen } from "@testing-library/react";
import { SubmitButton } from "./submit-button";

describe("SubmitButton", () => {
	it("renders with children when not loading", () => {
		render(<SubmitButton>Submit</SubmitButton>);

		const button = screen.getByTestId("form-button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("Submit");
		expect(button).not.toHaveAttribute("aria-busy", "true");
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	it("renders loading spinner when isLoading is true", () => {
		render(<SubmitButton isLoading>Submit</SubmitButton>);

		const button = screen.getByTestId("form-button");
		expect(button).toHaveAttribute("aria-busy", "true");

		const spinner = button.querySelector("svg");
		expect(spinner).toBeInTheDocument();
		expect(spinner).toHaveClass("animate-spin");
	});

	it("applies custom className", () => {
		render(<SubmitButton className="custom-class">Submit</SubmitButton>);

		const button = screen.getByTestId("form-button");
		expect(button).toHaveClass("custom-class");
	});

	it("has type='submit' by default", () => {
		render(<SubmitButton>Submit</SubmitButton>);

		const button = screen.getByTestId("form-button");
		expect(button).toHaveAttribute("type", "submit");
	});
});
