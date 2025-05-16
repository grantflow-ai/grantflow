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

	it("applies disabled styling when canBeDisabled is true", () => {
		render(<SubmitButton disabled>Submit</SubmitButton>);

		const button = screen.getByTestId("form-button");
		expect(button).toHaveClass("disabled:text-muted-foreground");
		expect(button).toHaveClass("disabled:bg-muted");
		expect(button).toHaveClass("disabled:cursor-not-allowed");
	});

	it("doesn't apply disabled styling when canBeDisabled is false", () => {
		render(
			<SubmitButton canBeDisabled={false} disabled>
				Submit
			</SubmitButton>,
		);

		const button = screen.getByTestId("form-button");
		expect(button).not.toHaveClass("disabled:text-muted-foreground");
		expect(button).not.toHaveClass("disabled:bg-muted");
		expect(button).not.toHaveClass("disabled:cursor-not-allowed");
	});

	it("displays custom rightIcon when provided and not loading", () => {
		const mockIcon = <span data-testid="custom-icon">Icon</span>;
		render(<SubmitButton rightIcon={mockIcon}>Submit</SubmitButton>);

		expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
	});

	it("replaces rightIcon with spinner when loading", () => {
		const mockIcon = <span data-testid="custom-icon">Icon</span>;
		render(
			<SubmitButton isLoading rightIcon={mockIcon}>
				Submit
			</SubmitButton>,
		);

		expect(screen.queryByTestId("custom-icon")).not.toBeInTheDocument();
		const spinner = screen.getByTestId("form-button").querySelector("svg");
		expect(spinner).toBeInTheDocument();
		expect(spinner).toHaveClass("animate-spin");
	});
});
