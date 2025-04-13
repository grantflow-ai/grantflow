import { render, screen } from "@testing-library/react";
import { AppButton } from "./app-button";
import { ArrowRight, User } from "lucide-react";

describe("AppButton", () => {
	it("renders button with default props", () => {
		render(<AppButton data-testid="test-button">Click Me</AppButton>);

		const button = screen.getByTestId("test-button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("Click Me");
		expect(button).toHaveClass("h-7.5");
	});

	it("applies custom className", () => {
		render(
			<AppButton className="custom-class" data-testid="test-button">
				Click Me
			</AppButton>,
		);

		const button = screen.getByTestId("test-button");
		expect(button).toHaveClass("custom-class");
	});

	it("renders with different sizes", () => {
		const { rerender } = render(
			<AppButton data-testid="test-button" size="sm">
				Small
			</AppButton>,
		);

		let button = screen.getByTestId("test-button");
		expect(button).toHaveClass("h-6");
		expect(button).toHaveClass("text-sm");

		rerender(
			<AppButton data-testid="test-button" size="md">
				Medium
			</AppButton>,
		);
		button = screen.getByTestId("test-button");
		expect(button).toHaveClass("h-7.5");

		rerender(
			<AppButton data-testid="test-button" size="lg">
				Large
			</AppButton>,
		);
		button = screen.getByTestId("test-button");
		expect(button).toHaveClass("h-9.5");
	});

	it("renders with different variants", () => {
		const { rerender } = render(
			<AppButton data-testid="test-button" variant="primary">
				Primary
			</AppButton>,
		);

		let button = screen.getByTestId("test-button");
		expect(button).toHaveClass("hover:bg-slate-500");

		rerender(
			<AppButton data-testid="test-button" variant="secondary">
				Secondary
			</AppButton>,
		);
		button = screen.getByTestId("test-button");
		expect(button).toHaveClass("bg-transparent");
		expect(button).toHaveClass("border");

		rerender(
			<AppButton data-testid="test-button" variant="link">
				Link
			</AppButton>,
		);
		button = screen.getByTestId("test-button");
		expect(button).toHaveClass("bg-transparent");
		expect(button).toHaveClass("rounded-none");
	});

	it("renders with different themes", () => {
		const { rerender } = render(
			<AppButton data-testid="test-button" theme="dark">
				Dark
			</AppButton>,
		);

		let button = screen.getByTestId("test-button");
		expect(button).not.toHaveClass("text-white");

		rerender(
			<AppButton data-testid="test-button" theme="light">
				Light
			</AppButton>,
		);
		button = screen.getByTestId("test-button");
		expect(button).toHaveClass("text-white");
	});

	it("renders with left icon", () => {
		render(
			<AppButton data-testid="test-button" leftIcon={<User data-testid="left-icon" />}>
				With Left Icon
			</AppButton>,
		);

		const button = screen.getByTestId("test-button");
		const icon = screen.getByTestId("left-icon");

		expect(icon).toBeInTheDocument();
		expect(button).toHaveTextContent("With Left Icon");
		expect(icon.parentElement).toHaveClass("mr-1");
	});

	it("renders with right icon", () => {
		render(
			<AppButton data-testid="test-button" rightIcon={<ArrowRight data-testid="right-icon" />}>
				With Right Icon
			</AppButton>,
		);

		const button = screen.getByTestId("test-button");
		const icon = screen.getByTestId("right-icon");

		expect(icon).toBeInTheDocument();
		expect(button).toHaveTextContent("With Right Icon");
		expect(icon.parentElement).toHaveClass("ml-1");
	});

	it("resizes icons according to button size", () => {
		const { rerender } = render(
			<AppButton data-testid="test-button" leftIcon={<User data-testid="icon" />} size="sm">
				Small Icon
			</AppButton>,
		);

		let icon = screen.getByTestId("icon");
		expect(icon).toHaveAttribute("width", "13");
		expect(icon).toHaveAttribute("height", "13");

		rerender(
			<AppButton data-testid="test-button" leftIcon={<User data-testid="icon" />} size="lg">
				Large Icon
			</AppButton>,
		);

		icon = screen.getByTestId("icon");
		expect(icon).toHaveAttribute("width", "19");
		expect(icon).toHaveAttribute("height", "19");
	});
});
