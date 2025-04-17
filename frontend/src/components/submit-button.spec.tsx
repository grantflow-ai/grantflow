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
		expect(button).not.toHaveTextContent("Submit");

		const spinner = button.querySelector("svg");
		expect(spinner).toBeInTheDocument();
		expect(spinner).toHaveClass("animate-spin");
	});

	it("applies custom className", () => {
		render(<SubmitButton className="custom-class">Submit</SubmitButton>);

		const button = screen.getByTestId("form-button");
		expect(button).toHaveClass("custom-class");
	});

	it("passes through other button props", () => {
		render(
			<SubmitButton data-custom="test-value" disabled variant="outline">
				Submit
			</SubmitButton>,
		);

		const button = screen.getByTestId("form-button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("data-custom", "test-value");
		expect(button).toHaveClass("border");
		expect(button).toHaveClass("border-input");
		expect(button).toHaveClass("bg-background");
	});

	it("has type='submit' by default", () => {
		render(<SubmitButton>Submit</SubmitButton>);

		const button = screen.getByTestId("form-button");
		expect(button).toHaveAttribute("type", "submit");
	});
});
