import { render, screen } from "@testing-library/react";
import { ArrowRight, User } from "lucide-react";

import { AppButton } from "@/components/app-button";

describe("AppButton", () => {
	it("renders button with default props", () => {
		render(<AppButton data-testid="test-button">Click Me</AppButton>);

		const button = screen.getByTestId("test-button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("Click Me");
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
		expect(button).toBeInTheDocument();

		rerender(
			<AppButton data-testid="test-button" size="md">
				Medium
			</AppButton>,
		);
		button = screen.getByTestId("test-button");
		expect(button).toBeInTheDocument();

		rerender(
			<AppButton data-testid="test-button" size="lg">
				Large
			</AppButton>,
		);
		button = screen.getByTestId("test-button");
		expect(button).toBeInTheDocument();
	});

	it("renders with different variants", () => {
		const { rerender } = render(
			<AppButton data-testid="test-button" variant="primary">
				Primary
			</AppButton>,
		);

		let button = screen.getByTestId("test-button");
		expect(button).toBeInTheDocument();

		rerender(
			<AppButton data-testid="test-button" variant="secondary">
				Secondary
			</AppButton>,
		);
		button = screen.getByTestId("test-button");
		expect(button).toBeInTheDocument();

		rerender(
			<AppButton data-testid="test-button" variant="link">
				Link
			</AppButton>,
		);
		button = screen.getByTestId("test-button");
		expect(button).toBeInTheDocument();
	});

	it("renders with different themes", () => {
		const { rerender } = render(
			<AppButton data-testid="test-button" theme="dark">
				Dark
			</AppButton>,
		);

		let button = screen.getByTestId("test-button");
		expect(button).toBeInTheDocument();

		rerender(
			<AppButton data-testid="test-button" theme="light">
				Light
			</AppButton>,
		);
		button = screen.getByTestId("test-button");
		expect(button).toBeInTheDocument();
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
		expect(icon.parentElement).toBeInTheDocument();
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
		expect(icon.parentElement).toBeInTheDocument();
	});
});
