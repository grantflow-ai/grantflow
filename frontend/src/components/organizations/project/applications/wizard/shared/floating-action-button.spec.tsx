import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FloatingActionButton } from "./floating-action-button";

describe("FloatingActionButton", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders the component", () => {
		render(
			<FloatingActionButton>
				<button type="button">Test Button</button>
			</FloatingActionButton>,
		);

		expect(screen.getByTestId("floating-action-button")).toBeInTheDocument();
	});

	it("renders children correctly", () => {
		render(
			<FloatingActionButton>
				<button data-testid="test-child" type="button">
					Test Button
				</button>
				<span data-testid="test-span">Test Span</span>
			</FloatingActionButton>,
		);

		expect(screen.getByTestId("test-child")).toBeInTheDocument();
		expect(screen.getByTestId("test-span")).toBeInTheDocument();
		expect(screen.getByTestId("test-child")).toHaveTextContent("Test Button");
		expect(screen.getByTestId("test-span")).toHaveTextContent("Test Span");
	});

	it("uses custom test id when provided", () => {
		render(
			<FloatingActionButton testId="custom-fab">
				<button type="button">Test Button</button>
			</FloatingActionButton>,
		);

		expect(screen.getByTestId("custom-fab")).toBeInTheDocument();
		expect(screen.queryByTestId("floating-action-button")).not.toBeInTheDocument();
	});

	it("applies custom className when provided", () => {
		render(
			<FloatingActionButton className="custom-class">
				<button type="button">Test Button</button>
			</FloatingActionButton>,
		);

		const fab = screen.getByTestId("floating-action-button");
		expect(fab).toHaveClass("custom-class");
	});

	it("merges custom className with default classes", () => {
		render(
			<FloatingActionButton className="justify-center">
				<button type="button">Test Button</button>
			</FloatingActionButton>,
		);

		const fab = screen.getByTestId("floating-action-button");
		expect(fab).toHaveClass("absolute", "bottom-0", "justify-center");
	});
});
