import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmitButton } from "./submit-button";

describe("FormButton Component", () => {
	it("renders without crashing", () => {
		render(<SubmitButton>Submit</SubmitButton>);
		expect(screen.getByTestId("form-button")).toBeDefined();
	});

	it("displays the correct text when not loading", () => {
		render(<SubmitButton>Submit</SubmitButton>);
		expect(screen.getByText("Submit")).toBeDefined();
	});

	it("displays a loading spinner when isLoading is true", () => {
		render(<SubmitButton isLoading={true}>Submit</SubmitButton>);
		expect(screen.queryByText("Submit")).toBeNull();
		expect(screen.getByTestId("form-button").querySelector("svg")).toBeDefined();
	});

	it("has the correct default attributes", () => {
		render(<SubmitButton>Submit</SubmitButton>);
		const button = screen.getByTestId("form-button");
		expect(button).toHaveAttribute("type", "submit");
	});

	it("updates aria-busy attribute when loading", () => {
		render(<SubmitButton isLoading={true}>Submit</SubmitButton>);
		expect(screen.getByTestId("form-button")).toHaveAttribute("aria-busy", "true");
	});

	it("applies additional classes correctly", () => {
		render(<SubmitButton className="extra-class">Submit</SubmitButton>);
		expect(screen.getByTestId("form-button")).toHaveClass("extra-class");
	});

	it("is disabled when the disabled prop is true", () => {
		render(<SubmitButton disabled={true}>Submit</SubmitButton>);
		expect(screen.getByTestId("form-button")).toBeDisabled();
	});

	it("calls onClick handler when clicked", async () => {
		const handleClick = vi.fn();
		render(<SubmitButton onClick={handleClick}>Submit</SubmitButton>);
		await userEvent.click(screen.getByTestId("form-button"));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it("does not call onClick handler when disabled", async () => {
		const handleClick = vi.fn();
		render(
			<SubmitButton onClick={handleClick} disabled={true}>
				Submit
			</SubmitButton>,
		);
		await userEvent.click(screen.getByTestId("form-button"));
		expect(handleClick).not.toHaveBeenCalled();
	});

	it("applies correct classes for disabled state", () => {
		render(<SubmitButton disabled={true}>Submit</SubmitButton>);
		const button = screen.getByTestId("form-button");
		expect(button).toHaveClass("disabled:text-muted-foreground-400");
		expect(button).toHaveClass("disabled:cursor-not-allowed");
	});

	it("applies correct classes for invalid state", () => {
		render(<SubmitButton className="invalid">Submit</SubmitButton>);
		const button = screen.getByTestId("form-button");
		expect(button).toHaveClass("invalid:text-destructive-400");
		expect(button).toHaveClass("invalid:cursor-not-allowed");
	});
});
