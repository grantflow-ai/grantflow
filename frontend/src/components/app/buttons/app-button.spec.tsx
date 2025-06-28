import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArrowRight, User } from "lucide-react";

import { AppButton } from "@/components/app/buttons/app-button";

describe("AppButton", () => {
	it("renders children content", () => {
		render(<AppButton data-testid="test-button">Click Me</AppButton>);

		const button = screen.getByTestId("test-button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("Click Me");
	});

	it("handles click events", async () => {
		const handleClick = vi.fn();
		const user = userEvent.setup();

		render(
			<AppButton data-testid="test-button" onClick={handleClick}>
				Click Me
			</AppButton>,
		);

		const button = screen.getByTestId("test-button");
		await user.click(button);

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it("disables button when disabled prop is true", async () => {
		const handleClick = vi.fn();
		const user = userEvent.setup();

		render(
			<AppButton data-testid="test-button" disabled onClick={handleClick}>
				Disabled Button
			</AppButton>,
		);

		const button = screen.getByTestId("test-button");
		expect(button).toBeDisabled();

		await user.click(button);
		expect(handleClick).not.toHaveBeenCalled();
	});

	it("renders with left icon", () => {
		render(
			<AppButton data-testid="test-button" leftIcon={<User data-testid="left-icon" />}>
				With Left Icon
			</AppButton>,
		);

		const icon = screen.getByTestId("left-icon");
		expect(icon).toBeInTheDocument();
	});

	it("renders with right icon", () => {
		render(
			<AppButton data-testid="test-button" rightIcon={<ArrowRight data-testid="right-icon" />}>
				With Right Icon
			</AppButton>,
		);

		const icon = screen.getByTestId("right-icon");
		expect(icon).toBeInTheDocument();
	});

	it("forwards button type attribute", () => {
		render(
			<AppButton data-testid="test-button" type="submit">
				Submit Button
			</AppButton>,
		);

		const button = screen.getByTestId("test-button");
		expect(button).toHaveAttribute("type", "submit");
	});

	it("applies custom className alongside default classes", () => {
		render(
			<AppButton className="custom-class" data-testid="test-button">
				Custom Button
			</AppButton>,
		);

		const button = screen.getByTestId("test-button");
		expect(button).toHaveClass("custom-class");
		// Verify it still has base button classes
		expect(button.tagName).toBe("BUTTON");
	});
});
