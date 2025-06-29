import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SectionIconButton } from "./section-icon-button";

describe("SectionIconButton", () => {
	it("renders children correctly", () => {
		render(
			<SectionIconButton>
				<span data-testid="test-icon">Test Icon</span>
			</SectionIconButton>,
		);

		expect(screen.getByTestId("test-icon")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		render(
			<SectionIconButton className="custom-class">
				<span data-testid="icon">Icon</span>
			</SectionIconButton>,
		);

		const button = screen.getByRole("button");
		expect(button).toHaveClass("custom-class");
	});

	it("calls onClick handler when clicked", () => {
		const handleClick = vi.fn();
		render(
			<SectionIconButton onClick={handleClick}>
				<span data-testid="icon">Icon</span>
			</SectionIconButton>,
		);

		const button = screen.getByRole("button");
		fireEvent.click(button);

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it("works without onClick handler", () => {
		render(
			<SectionIconButton>
				<span data-testid="icon">Icon</span>
			</SectionIconButton>,
		);

		const button = screen.getByRole("button");
		expect(() => fireEvent.click(button)).not.toThrow();
	});

	it("has correct button type", () => {
		render(
			<SectionIconButton>
				<span data-testid="icon">Icon</span>
			</SectionIconButton>,
		);

		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("type", "button");
	});
});
