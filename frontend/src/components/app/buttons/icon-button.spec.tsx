import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Plus } from "lucide-react";
import { vi } from "vitest";

import { IconButton } from "./icon-button";

describe("IconButton", () => {
	it("renders with default props", () => {
		render(
			<IconButton>
				<Plus className="size-4" />
			</IconButton>,
		);

		const button = screen.getByRole("button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveClass("size-8"); // default md size
		expect(button).toHaveClass("bg-primary"); // default solid variant
	});

	it("renders with custom className", () => {
		render(
			<IconButton className="custom-class">
				<Plus className="size-4" />
			</IconButton>,
		);

		const button = screen.getByRole("button");
		expect(button).toHaveClass("custom-class");
	});

	it("handles click events", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();

		render(
			<IconButton onClick={onClick}>
				<Plus className="size-4" />
			</IconButton>,
		);

		const button = screen.getByRole("button");
		await user.click(button);

		expect(onClick).toHaveBeenCalledOnce();
	});

	it("does not handle click events when disabled", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();

		render(
			<IconButton disabled onClick={onClick}>
				<Plus className="size-4" />
			</IconButton>,
		);

		const button = screen.getByRole("button");
		await user.click(button);

		expect(onClick).not.toHaveBeenCalled();
		expect(button).toBeDisabled();
	});

	describe("variants", () => {
		it("renders solid variant", () => {
			render(
				<IconButton variant="solid">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("bg-primary");
			expect(button).toHaveClass("text-primary-foreground");
		});

		it("renders float variant", () => {
			render(
				<IconButton variant="float">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("bg-transparent");
			expect(button).toHaveClass("text-primary");
		});
	});

	describe("sizes", () => {
		it("renders small size", () => {
			render(
				<IconButton size="sm">
					<Plus className="size-3" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("size-6");
		});

		it("renders medium size (default)", () => {
			render(
				<IconButton size="md">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("size-8");
		});

		it("renders large size", () => {
			render(
				<IconButton size="lg">
					<Plus className="size-5" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("size-10");
		});
	});

	describe("disabled state", () => {
		it("applies disabled styles for solid variant", () => {
			render(
				<IconButton disabled variant="solid">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			expect(button).toBeDisabled();
			expect(button).toHaveClass("disabled:bg-gray-200");
		});

		it("applies disabled styles for float variant", () => {
			render(
				<IconButton disabled variant="float">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			expect(button).toBeDisabled();
			expect(button).toHaveClass("disabled:text-gray-100");
		});
	});

	describe("asChild prop", () => {
		it("renders as child component when asChild is true", () => {
			render(
				<IconButton asChild>
					<a href="/test">
						<Plus className="size-4" />
					</a>
				</IconButton>,
			);

			const link = screen.getByRole("link");
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute("href", "/test");
			expect(link).toHaveClass("size-8"); // IconButton classes applied
		});

		it("renders as button when asChild is false", () => {
			render(
				<IconButton asChild={false}>
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			expect(button).toBeInTheDocument();
			expect(button.tagName).toBe("BUTTON");
		});
	});

	describe("accessibility", () => {
		it("supports aria-label", () => {
			render(
				<IconButton aria-label="Add item">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByRole("button", { name: "Add item" });
			expect(button).toBeInTheDocument();
		});

		it("supports custom type attribute", () => {
			render(
				<IconButton type="submit">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("type", "submit");
		});

		it("has proper focus styles", () => {
			render(
				<IconButton>
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("focus-visible:outline-2");
			expect(button).toHaveClass("focus-visible:outline-offset-2");
			expect(button).toHaveClass("focus-visible:outline-ring");
		});
	});

	describe("keyboard navigation", () => {
		it("handles keyboard events", async () => {
			const user = userEvent.setup();
			const onClick = vi.fn();

			render(
				<IconButton onClick={onClick}>
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			await user.tab();
			expect(button).toHaveFocus();

			await user.keyboard("{Enter}");
			expect(onClick).toHaveBeenCalledOnce();

			await user.keyboard("{Space}");
			expect(onClick).toHaveBeenCalledTimes(2);
		});

		it("does not handle keyboard events when disabled", async () => {
			const user = userEvent.setup();
			const onClick = vi.fn();

			render(
				<IconButton disabled onClick={onClick}>
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			await user.tab();
			expect(button).not.toHaveFocus();

			await user.keyboard("{Enter}");
			expect(onClick).not.toHaveBeenCalled();
			expect(button).toBeDisabled();
		});
	});

	describe("custom props", () => {
		it("forwards custom data attributes", () => {
			render(
				<IconButton data-custom="value" data-testid="custom-button">
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByTestId("custom-button");
			expect(button).toHaveAttribute("data-custom", "value");
		});

		it("forwards custom event handlers", async () => {
			const user = userEvent.setup();
			const onMouseEnter = vi.fn();
			const onMouseLeave = vi.fn();

			render(
				<IconButton onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
					<Plus className="size-4" />
				</IconButton>,
			);

			const button = screen.getByRole("button");
			await user.hover(button);
			expect(onMouseEnter).toHaveBeenCalledOnce();

			await user.unhover(button);
			expect(onMouseLeave).toHaveBeenCalledOnce();
		});
	});
});
