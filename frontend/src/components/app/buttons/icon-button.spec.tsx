import { cleanup, render } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Plus } from "lucide-react";
import { afterEach, vi } from "vitest";

import { IconButton } from "./icon-button";

afterEach(() => {
	cleanup();
});

describe.sequential("IconButton", () => {
	it("renders with default props", () => {
		const { container } = render(
			<IconButton data-testid="icon-button">
				<Plus className="size-4" />
			</IconButton>,
		);

		const button = container.querySelector('[data-testid="icon-button"]');
		expect(button).toBeInTheDocument();
		expect(button).toHaveClass("size-8"); // default md size
		expect(button).toHaveClass("bg-primary"); // default solid variant
	});

	it("renders with custom className", () => {
		const { container } = render(
			<IconButton className="custom-class" data-testid="icon-button-custom">
				<Plus className="size-4" />
			</IconButton>,
		);

		const button = container.querySelector('[data-testid="icon-button-custom"]');
		expect(button).toHaveClass("custom-class");
	});

	it("handles click events", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();

		const { getByTestId } = render(
			<IconButton data-testid="icon-button-click" onClick={onClick}>
				<Plus className="size-4" />
			</IconButton>,
		);

		const button = getByTestId("icon-button-click");
		await user.click(button);

		expect(onClick).toHaveBeenCalledOnce();
	});

	it("does not handle click events when disabled", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();

		const { container } = render(
			<IconButton data-testid="icon-button-disabled" disabled onClick={onClick}>
				<Plus className="size-4" />
			</IconButton>,
		);

		const button = container.querySelector('[data-testid="icon-button-disabled"]');
		await user.click(button!);

		expect(onClick).not.toHaveBeenCalled();
		expect(button).toBeDisabled();
	});

	describe("variants", () => {
		it("renders solid variant", () => {
			const { container } = render(
				<IconButton data-testid="icon-button-solid" variant="solid">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-solid"]');
			expect(button).toHaveClass("bg-primary");
			expect(button).toHaveClass("text-primary-foreground");
		});

		it("renders float variant", () => {
			const { container } = render(
				<IconButton data-testid="icon-button-float" variant="float">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-float"]');
			expect(button).toHaveClass("bg-transparent");
			expect(button).toHaveClass("text-primary");
		});
	});

	describe("sizes", () => {
		it("renders small size", () => {
			const { container } = render(
				<IconButton data-testid="icon-button-size-sm" size="sm">
					<Plus className="size-3" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-size-sm"]');
			expect(button).toHaveClass("size-6");
		});

		it("renders medium size (default)", () => {
			const { container } = render(
				<IconButton data-testid="icon-button-size-md" size="md">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-size-md"]');
			expect(button).toHaveClass("size-8");
		});

		it("renders large size", () => {
			const { container } = render(
				<IconButton data-testid="icon-button-size-lg" size="lg">
					<Plus className="size-5" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-size-lg"]');
			expect(button).toHaveClass("size-10");
		});
	});

	describe("disabled state", () => {
		it("applies disabled styles for solid variant", () => {
			const { container } = render(
				<IconButton data-testid="icon-button-disabled-solid" disabled variant="solid">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-disabled-solid"]');
			expect(button).toBeDisabled();
			expect(button).toHaveClass("disabled:bg-gray-200");
		});

		it("applies disabled styles for float variant", () => {
			const { container } = render(
				<IconButton data-testid="icon-button-disabled-float" disabled variant="float">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-disabled-float"]');
			expect(button).toBeDisabled();
			expect(button).toHaveClass("disabled:text-gray-100");
		});
	});

	describe("asChild prop", () => {
		it("renders as child component when asChild is true", () => {
			const { container } = render(
				<IconButton asChild data-testid="icon-button-as-child">
					<a href="/test">
						<Plus className="size-4" />
					</a>
				</IconButton>,
			);

			const link = container.querySelector('[data-testid="icon-button-as-child"]');
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute("href", "/test");
			expect(link).toHaveClass("size-8"); // IconButton classes applied
		});

		it("renders as button when asChild is false", () => {
			const { container } = render(
				<IconButton asChild={false} data-testid="icon-button-as-button">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-as-button"]');
			expect(button).toBeInTheDocument();
			expect(button!.tagName).toBe("BUTTON");
		});
	});

	describe("accessibility", () => {
		it("supports aria-label", () => {
			const { container } = render(
				<IconButton aria-label="Add item" data-testid="icon-button-aria-label">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-aria-label"]');
			expect(button).toBeInTheDocument();
			expect(button).toHaveAttribute("aria-label", "Add item");
		});

		it("supports custom type attribute", () => {
			const { container } = render(
				<IconButton data-testid="icon-button-type-submit" type="submit">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-type-submit"]');
			expect(button).toHaveAttribute("type", "submit");
		});

		it("has proper focus styles", () => {
			const { container } = render(
				<IconButton data-testid="icon-button-focus-styles">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-focus-styles"]');
			expect(button).toHaveClass("focus-visible:outline-2");
			expect(button).toHaveClass("focus-visible:outline-offset-2");
			expect(button).toHaveClass("focus-visible:outline-ring");
		});
	});

	describe("keyboard navigation", () => {
		it("handles keyboard events", async () => {
			const user = userEvent.setup();
			const onClick = vi.fn();

			const { getByTestId } = render(
				<IconButton data-testid="icon-button-keyboard" onClick={onClick}>
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = getByTestId("icon-button-keyboard");
			button.focus();
			expect(button).toHaveFocus();

			await user.keyboard("{Enter}");
			expect(onClick).toHaveBeenCalledOnce();

			await user.keyboard(" ");
			expect(onClick).toHaveBeenCalledTimes(2);
		});

		it("does not handle keyboard events when disabled", async () => {
			const user = userEvent.setup();
			const onClick = vi.fn();

			const { container } = render(
				<IconButton data-testid="icon-button-keyboard-disabled" disabled onClick={onClick}>
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-keyboard-disabled"]');
			await user.tab();
			expect(button).not.toHaveFocus();

			await user.keyboard("{Enter}");
			expect(onClick).not.toHaveBeenCalled();
			expect(button).toBeDisabled();
		});
	});

	describe("custom props", () => {
		it("forwards custom data attributes", () => {
			const { container } = render(
				<IconButton data-custom="value" data-testid="icon-button-custom-data">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = container.querySelector('[data-testid="icon-button-custom-data"]');
			expect(button).toHaveAttribute("data-custom", "value");
		});

		it("forwards custom event handlers", async () => {
			const user = userEvent.setup();
			const onMouseEnter = vi.fn();
			const onMouseLeave = vi.fn();

			const { getByTestId } = render(
				<IconButton
					data-testid="icon-button-custom-events"
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
				>
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = getByTestId("icon-button-custom-events");
			await user.hover(button);
			expect(onMouseEnter).toHaveBeenCalledOnce();

			await user.unhover(button);
			expect(onMouseLeave).toHaveBeenCalledOnce();
		});
	});
});
