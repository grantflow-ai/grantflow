import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FloatingActionPanel } from "./floating-action-panel";

describe("FloatingActionPanel", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders the component", () => {
		render(
			<FloatingActionPanel>
				<button type="button">Test Button</button>
			</FloatingActionPanel>,
		);

		expect(screen.getByTestId("floating-action-panel")).toBeInTheDocument();
	});

	it("renders children correctly", () => {
		render(
			<FloatingActionPanel>
				<button data-testid="test-child" type="button">
					Test Button
				</button>
				<span data-testid="test-span">Test Span</span>
			</FloatingActionPanel>,
		);

		expect(screen.getByTestId("test-child")).toBeInTheDocument();
		expect(screen.getByTestId("test-span")).toBeInTheDocument();
		expect(screen.getByTestId("test-child")).toHaveTextContent("Test Button");
		expect(screen.getByTestId("test-span")).toHaveTextContent("Test Span");
	});

	it("uses custom test id when provided", () => {
		render(
			<FloatingActionPanel testId="custom-fab">
				<button type="button">Test Button</button>
			</FloatingActionPanel>,
		);

		expect(screen.getByTestId("custom-fab")).toBeInTheDocument();
		expect(screen.queryByTestId("floating-action-panel")).not.toBeInTheDocument();
	});

	it("applies custom className when provided", () => {
		render(
			<FloatingActionPanel className="custom-class">
				<button type="button">Test Button</button>
			</FloatingActionPanel>,
		);

		const fab = screen.getByTestId("floating-action-panel");
		expect(fab).toHaveClass("custom-class");
	});

	it("merges custom className with default classes", () => {
		render(
			<FloatingActionPanel className="justify-center">
				<button type="button">Test Button</button>
			</FloatingActionPanel>,
		);

		const fab = screen.getByTestId("floating-action-panel");
		expect(fab).toHaveClass("absolute", "justify-center");
	});
});
