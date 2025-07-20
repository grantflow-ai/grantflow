import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Mock the problematic Radix UI components for testing
vi.mock("@/components/ui/dropdown-menu", () => {
	return {
		DropdownMenu: ({ children, ...props }: any) => (
			<div data-testid="dropdown-menu" {...props}>
				{children}
			</div>
		),
		DropdownMenuCheckboxItem: ({ children, ...props }: any) => (
			<div data-testid="dropdown-menu-checkbox-item" {...props}>
				{children}
			</div>
		),
		DropdownMenuContent: ({ children, ...props }: any) => (
			<div data-testid="dropdown-menu-content" {...props}>
				{children}
			</div>
		),
		DropdownMenuGroup: ({ children, ...props }: any) => (
			<div data-testid="dropdown-menu-group" {...props}>
				{children}
			</div>
		),
		DropdownMenuItem: ({ children, className, inset, variant, ...props }: any) => (
			<div
				className={className}
				data-inset={inset ? "true" : undefined}
				data-testid="dropdown-menu-item"
				data-variant={variant}
				{...props}
			>
				{children}
			</div>
		),
		DropdownMenuLabel: ({ children, ...props }: any) => (
			<div data-testid="dropdown-menu-label" {...props}>
				{children}
			</div>
		),
		DropdownMenuRadioGroup: ({ children, ...props }: any) => (
			<div data-testid="dropdown-menu-radio-group" {...props}>
				{children}
			</div>
		),
		DropdownMenuRadioItem: ({ children, ...props }: any) => (
			<div data-testid="dropdown-menu-radio-item" {...props}>
				{children}
			</div>
		),
		DropdownMenuSeparator: (props: any) => <div data-testid="dropdown-menu-separator" {...props} />,
		DropdownMenuShortcut: ({ children, ...props }: any) => (
			<div data-testid="dropdown-menu-shortcut" {...props}>
				{children}
			</div>
		),
		DropdownMenuSub: ({ children, ...props }: any) => (
			<div data-testid="dropdown-menu-sub" {...props}>
				{children}
			</div>
		),
		DropdownMenuSubContent: ({ children, ...props }: any) => (
			<div data-testid="dropdown-menu-sub-content" {...props}>
				{children}
			</div>
		),
		DropdownMenuSubTrigger: ({ children, ...props }: any) => (
			<div data-testid="dropdown-menu-sub-trigger" {...props}>
				{children}
			</div>
		),
		DropdownMenuTrigger: ({ children, ...props }: any) => (
			<div data-testid="dropdown-menu-trigger" {...props}>
				{children}
			</div>
		),
	};
});

import {
	AppDropdownMenu,
	AppDropdownMenuCheckboxItem,
	AppDropdownMenuContent,
	AppDropdownMenuGroup,
	AppDropdownMenuItem,
	AppDropdownMenuLabel,
	AppDropdownMenuRadioGroup,
	AppDropdownMenuRadioItem,
	AppDropdownMenuSeparator,
	AppDropdownMenuShortcut,
	AppDropdownMenuSub,
	AppDropdownMenuSubContent,
	AppDropdownMenuSubTrigger,
	AppDropdownMenuTrigger,
	DangerMenuItem,
} from "./app-dropdown";

afterEach(() => {
	cleanup();
});

describe("AppDropdownMenu", () => {
	it("renders dropdown menu with children", () => {
		const { container } = render(
			<AppDropdownMenu data-testid="test-app-dropdown-menu">
				<div>Menu content</div>
			</AppDropdownMenu>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu"]')).toBeInTheDocument();
		expect(container.querySelector("div")).toHaveTextContent("Menu content");
	});

	it("forwards props to DropdownMenu component", () => {
		const { container } = render(
			<AppDropdownMenu data-testid="test-app-dropdown-menu-props" open>
				<div>Content</div>
			</AppDropdownMenu>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu"]')).toHaveAttribute("open", "");
	});
});

describe("AppDropdownMenuTrigger", () => {
	it("renders trigger element", () => {
		const { container } = render(
			<AppDropdownMenuTrigger data-testid="test-app-dropdown-menu-trigger">
				<button type="button">Open Menu</button>
			</AppDropdownMenuTrigger>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-trigger"]')).toBeInTheDocument();
		expect(container.querySelector("button")).toHaveTextContent("Open Menu");
	});
});

describe("AppDropdownMenuContent", () => {
	it("renders content with children", () => {
		const { container } = render(
			<AppDropdownMenuContent data-testid="test-app-dropdown-menu-content">Menu items</AppDropdownMenuContent>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-content"]')).toBeInTheDocument();
		expect(container.querySelector("div")).toHaveTextContent("Menu items");
	});
});

describe("AppDropdownMenuItem", () => {
	it("renders with testid and default variant", () => {
		const { container } = render(
			<AppDropdownMenuItem data-testid="test-app-dropdown-menu-item-1">Menu item</AppDropdownMenuItem>,
		);

		const item = container.querySelector('[data-testid="dropdown-menu-item"]');
		expect(item).toBeInTheDocument();
		expect(item).toHaveAttribute("data-variant", "default");
		expect(item).toHaveTextContent("Menu item");
	});

	it("renders with custom variant", () => {
		const { container } = render(
			<AppDropdownMenuItem data-testid="test-app-dropdown-menu-item-2" variant="destructive">
				Delete item
			</AppDropdownMenuItem>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-item"]')).toHaveAttribute(
			"data-variant",
			"destructive",
		);
	});

	it("applies inset prop", () => {
		const { container } = render(
			<AppDropdownMenuItem data-testid="test-app-dropdown-menu-item-3" inset>
				Inset item
			</AppDropdownMenuItem>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-item"]')).toHaveAttribute("data-inset", "true");
	});

	it("forwards other props", () => {
		const { container } = render(
			<AppDropdownMenuItem
				className="custom-class"
				data-testid="test-app-dropdown-menu-item-4"
				onClick={() => {}}
			>
				Item
			</AppDropdownMenuItem>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-item"]')).toHaveClass("custom-class");
	});
});

describe("AppDropdownMenuLabel", () => {
	it("renders label", () => {
		const { container } = render(<AppDropdownMenuLabel>Section Label</AppDropdownMenuLabel>);

		expect(container.querySelector('[data-testid="dropdown-menu-label"]')).toBeInTheDocument();
		expect(screen.getByText("Section Label")).toBeInTheDocument();
	});
});

describe("AppDropdownMenuSeparator", () => {
	it("renders separator", () => {
		const { container } = render(<AppDropdownMenuSeparator />);

		expect(container.querySelector('[data-testid="dropdown-menu-separator"]')).toBeInTheDocument();
	});
});

describe("AppDropdownMenuShortcut", () => {
	it("renders shortcut", () => {
		const { container } = render(<AppDropdownMenuShortcut>⌘K</AppDropdownMenuShortcut>);

		expect(container.querySelector('[data-testid="dropdown-menu-shortcut"]')).toBeInTheDocument();
		expect(screen.getByText("⌘K")).toBeInTheDocument();
	});
});

describe("AppDropdownMenuGroup", () => {
	it("renders group with children", () => {
		const { container } = render(
			<AppDropdownMenuGroup>
				<div>Group item 1</div>
				<div>Group item 2</div>
			</AppDropdownMenuGroup>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-group"]')).toBeInTheDocument();
		expect(container.querySelector("div")).toHaveTextContent("Group item 1Group item 2");
	});
});

describe("AppDropdownMenuCheckboxItem", () => {
	it("renders checkbox item", () => {
		const { container } = render(
			<AppDropdownMenuCheckboxItem data-testid="test-app-dropdown-menu-checkbox-item">
				Checkbox item
			</AppDropdownMenuCheckboxItem>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-checkbox-item"]')).toBeInTheDocument();
		expect(container.querySelector("div")).toHaveTextContent("Checkbox item");
	});
});

describe("AppDropdownMenuRadioGroup", () => {
	it("renders radio group", () => {
		const { container } = render(
			<AppDropdownMenuRadioGroup data-testid="test-app-dropdown-menu-radio-group" value="option1">
				<div>Radio options</div>
			</AppDropdownMenuRadioGroup>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-radio-group"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="dropdown-menu-radio-group"]')).toHaveAttribute(
			"value",
			"option1",
		);
	});
});

describe("AppDropdownMenuRadioItem", () => {
	it("renders radio item", () => {
		const { container } = render(
			<AppDropdownMenuRadioItem data-testid="test-app-dropdown-menu-radio-item" value="option1">
				Option 1
			</AppDropdownMenuRadioItem>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-radio-item"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="dropdown-menu-radio-item"]')).toHaveAttribute("value", "option1");
	});
});

describe("AppDropdownMenuSub", () => {
	it("renders sub menu", () => {
		const { container } = render(
			<AppDropdownMenuSub data-testid="test-app-dropdown-menu-sub">
				<div>Sub menu content</div>
			</AppDropdownMenuSub>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-sub"]')).toBeInTheDocument();
		expect(container.querySelector("div")).toHaveTextContent("Sub menu content");
	});
});

describe("AppDropdownMenuSubTrigger", () => {
	it("renders sub trigger", () => {
		const { container } = render(
			<AppDropdownMenuSubTrigger data-testid="test-app-dropdown-menu-sub-trigger">
				More options
			</AppDropdownMenuSubTrigger>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-sub-trigger"]')).toBeInTheDocument();
		expect(container.querySelector("div")).toHaveTextContent("More options");
	});
});

describe("AppDropdownMenuSubContent", () => {
	it("renders sub content", () => {
		const { container } = render(
			<AppDropdownMenuSubContent data-testid="test-app-dropdown-menu-sub-content">
				Sub menu items
			</AppDropdownMenuSubContent>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-sub-content"]')).toBeInTheDocument();
		expect(container.querySelector("div")).toHaveTextContent("Sub menu items");
	});
});

describe("DangerMenuItem", () => {
	it("renders with danger styling and testid", () => {
		const { container } = render(<DangerMenuItem>Delete</DangerMenuItem>);

		const item = container.querySelector('[data-testid="dropdown-menu-item"]');
		expect(item).toBeInTheDocument();
		expect(item).toHaveAttribute("data-variant", "destructive");
		expect(item).toHaveClass("text-destructive");
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("applies custom className alongside danger styling", () => {
		const { container } = render(<DangerMenuItem className="custom-danger">Delete</DangerMenuItem>);

		const item = container.querySelector('[data-testid="dropdown-menu-item"]');
		expect(item).toHaveClass("text-destructive", "custom-danger");
	});

	it("forwards other props", () => {
		const onClick = vi.fn();
		const { container } = render(
			<DangerMenuItem data-testid="test-danger-menu-item-3" disabled onClick={onClick}>
				Delete
			</DangerMenuItem>,
		);

		expect(container.querySelector('[data-testid="dropdown-menu-item"]')).toHaveAttribute("disabled", "");
	});

	it("renders complex children", () => {
		const { container } = render(
			<DangerMenuItem data-testid="test-danger-menu-item-4">
				<span>🗑️</span>
				<span>Delete item</span>
			</DangerMenuItem>,
		);

		const item = container.querySelector('[data-testid="dropdown-menu-item"]');
		expect(item).toHaveTextContent("🗑️Delete item");
	});
});
