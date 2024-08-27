import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormButton } from "./form-button";

describe("FormButton Component", () => {
	it("renders without crashing", () => {
		render(<FormButton>Submit</FormButton>);
		expect(screen.getByTestId("form-button")).toBeDefined();
	});

	it("displays the correct text when not loading", () => {
		render(<FormButton>Submit</FormButton>);
		expect(screen.getByText("Submit")).toBeDefined();
	});

	it("displays a loading spinner when isLoading is true", () => {
		render(<FormButton isLoading={true}>Submit</FormButton>);
		expect(screen.queryByText("Submit")).toBeNull();
		expect(screen.getByTestId("form-button").querySelector("svg")).toBeDefined();
	});

	it("has the correct default attributes", () => {
		render(<FormButton>Submit</FormButton>);
		const button = screen.getByTestId("form-button");
		expect(button).toHaveAttribute("type", "submit");
	});

	it("updates aria-busy attribute when loading", () => {
		render(<FormButton isLoading={true}>Submit</FormButton>);
		expect(screen.getByTestId("form-button")).toHaveAttribute("aria-busy", "true");
	});

	it("applies additional classes correctly", () => {
		render(<FormButton className="extra-class">Submit</FormButton>);
		expect(screen.getByTestId("form-button")).toHaveClass("extra-class");
	});

	it("is disabled when the disabled prop is true", () => {
		render(<FormButton disabled={true}>Submit</FormButton>);
		expect(screen.getByTestId("form-button")).toBeDisabled();
	});

	it("calls onClick handler when clicked", async () => {
		const handleClick = vi.fn();
		render(<FormButton onClick={handleClick}>Submit</FormButton>);
		await userEvent.click(screen.getByTestId("form-button"));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it("does not call onClick handler when disabled", async () => {
		const handleClick = vi.fn();
		render(
			<FormButton onClick={handleClick} disabled={true}>
				Submit
			</FormButton>,
		);
		await userEvent.click(screen.getByTestId("form-button"));
		expect(handleClick).not.toHaveBeenCalled();
	});

	it("applies correct classes for disabled state", () => {
		render(<FormButton disabled={true}>Submit</FormButton>);
		const button = screen.getByTestId("form-button");
		expect(button).toHaveClass("disabled:text-gray-400");
		expect(button).toHaveClass("disabled:cursor-not-allowed");
	});

	it("applies correct classes for invalid state", () => {
		render(<FormButton className="invalid">Submit</FormButton>);
		const button = screen.getByTestId("form-button");
		expect(button).toHaveClass("invalid:text-gray-400");
		expect(button).toHaveClass("invalid:cursor-not-allowed");
	});
});
