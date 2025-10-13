import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AiAutofillButton } from "./ai-autofill-button";

describe("AiAutofillButton", () => {
	it("should render the button with the default text", () => {
		render(<AiAutofillButton onCancel={() => {}} onClick={() => {}} />);
		expect(screen.getByText("Let the AI Try!")).toBeInTheDocument();
	});

	it("should call the onClick handler when not loading and clicked", () => {
		const handleClick = vi.fn();
		const handleCancel = vi.fn();
		render(<AiAutofillButton onCancel={handleCancel} onClick={handleClick} />);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(handleCancel).not.toHaveBeenCalled();
	});

	it("should show cancel text and call onCancel when isLoading is true and clicked", () => {
		const handleClick = vi.fn();
		const handleCancel = vi.fn();
		render(<AiAutofillButton isLoading onCancel={handleCancel} onClick={handleClick} />);
		const button = screen.getByRole("button");

		expect(button).not.toBeDisabled();
		expect(screen.getByText("Stop Generate")).toBeInTheDocument();
		expect(screen.queryByText("Let the AI Try!")).not.toBeInTheDocument();

		fireEvent.click(button);
		expect(handleCancel).toHaveBeenCalledTimes(1);
		expect(handleClick).not.toHaveBeenCalled();
	});
});
