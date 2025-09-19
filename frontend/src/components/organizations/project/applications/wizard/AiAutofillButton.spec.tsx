import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AiAutofillButton } from "./AiAutofillButton";

describe("AiAutofillButton", () => {
	it("should render the button with the default text", () => {
		render(<AiAutofillButton onClick={() => {}} />);
		expect(screen.getByText("Let the AI Try!")).toBeInTheDocument();
	});

	it("should call the onClick handler when clicked", () => {
		const handleClick = vi.fn();
		render(<AiAutofillButton onClick={handleClick} />);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it("should disable the button when the disabled prop is true", () => {
		const handleClick = vi.fn();
		render(<AiAutofillButton onClick={handleClick} disabled />);
		const button = screen.getByRole("button") as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		fireEvent.click(button);
		expect(handleClick).not.toHaveBeenCalled();
	});

	it("should disable the button and show loading text when isLoading is true", () => {
		const handleClick = vi.fn();
		render(<AiAutofillButton onClick={handleClick} isLoading />);
		const button = screen.getByRole("button") as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		expect(screen.getByText("Generating...")).toBeInTheDocument();
		expect(screen.queryByText("Let the AI Try!")).not.toBeInTheDocument();
		fireEvent.click(button);
		expect(handleClick).not.toHaveBeenCalled();
	});
});
