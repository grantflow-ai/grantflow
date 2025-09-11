import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SectionIconButton } from "./section-icon-button";

describe.sequential("SectionIconButton", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders children correctly", () => {
		render(
			<SectionIconButton data-testid="renders-children-button">
				<span data-testid="test-icon">Test Icon</span>
			</SectionIconButton>,
		);

		expect(screen.getByTestId("test-icon")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		const { container } = render(
			<SectionIconButton className="custom-class" data-testid="custom-class-button">
				<span data-testid="icon">Icon</span>
			</SectionIconButton>,
		);

		const button = container.querySelector('[data-testid="custom-class-button"]');
		expect(button).toHaveClass("custom-class");
	});

	it("calls onClick handler when clicked", () => {
		const handleClick = vi.fn();
		const { container } = render(
			<SectionIconButton data-testid="click-handler-button" onClick={handleClick}>
				<span data-testid="icon">Icon</span>
			</SectionIconButton>,
		);

		const button = container.querySelector('[data-testid="click-handler-button"]');
		fireEvent.click(button!);

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it("works without onClick handler", () => {
		const { container } = render(
			<SectionIconButton data-testid="no-click-handler-button">
				<span data-testid="icon">Icon</span>
			</SectionIconButton>,
		);

		const button = container.querySelector('[data-testid="no-click-handler-button"]');
		expect(() => fireEvent.click(button!)).not.toThrow();
	});

	it("has correct button type", () => {
		const { container } = render(
			<SectionIconButton data-testid="button-type-button">
				<span data-testid="icon">Icon</span>
			</SectionIconButton>,
		);

		const button = container.querySelector('[data-testid="button-type-button"]');
		expect(button).toHaveAttribute("type", "button");
	});
});
