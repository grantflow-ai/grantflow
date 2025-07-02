import { render, screen } from "@testing-library/react";

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

vi.mock("@/components/ui/dropdown-menu", () => ({
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
	DropdownMenuItem: ({ children, inset, variant, ...props }: any) => (
		<div data-inset={inset} data-testid="dropdown-menu-item" data-variant={variant} {...props}>
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
	DropdownMenuSeparator: ({ ...props }: any) => <div data-testid="dropdown-menu-separator" {...props} />,
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
}));

describe("AppDropdownMenu", () => {
	it("renders dropdown menu with children", () => {
		render(
			<AppDropdownMenu>
				<div>Menu content</div>
			</AppDropdownMenu>,
		);

		expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
		expect(screen.getByText("Menu content")).toBeInTheDocument();
	});

	it("forwards props to DropdownMenu component", () => {
		render(
			<AppDropdownMenu open>
				<div>Content</div>
			</AppDropdownMenu>,
		);

		expect(screen.getByTestId("dropdown-menu")).toHaveAttribute("open", "");
	});
});

describe("AppDropdownMenuTrigger", () => {
	it("renders trigger element", () => {
		render(
			<AppDropdownMenuTrigger>
				<button type="button">Open Menu</button>
			</AppDropdownMenuTrigger>,
		);

		expect(screen.getByTestId("dropdown-menu-trigger")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Open Menu" })).toBeInTheDocument();
	});
});

describe("AppDropdownMenuContent", () => {
	it("renders content with children", () => {
		render(<AppDropdownMenuContent>Menu items</AppDropdownMenuContent>);

		expect(screen.getByTestId("dropdown-menu-content")).toBeInTheDocument();
		expect(screen.getByText("Menu items")).toBeInTheDocument();
	});
});

describe("AppDropdownMenuItem", () => {
	it("renders with testid and default variant", () => {
		render(<AppDropdownMenuItem>Menu item</AppDropdownMenuItem>);

		const item = screen.getByTestId("app-dropdown-menu-item");
		expect(item).toBeInTheDocument();
		expect(item).toHaveAttribute("data-variant", "default");
		expect(screen.getByText("Menu item")).toBeInTheDocument();
	});

	it("renders with custom variant", () => {
		render(<AppDropdownMenuItem variant="destructive">Delete item</AppDropdownMenuItem>);

		expect(screen.getByTestId("app-dropdown-menu-item")).toHaveAttribute("data-variant", "destructive");
	});

	it("applies inset prop", () => {
		render(<AppDropdownMenuItem inset>Inset item</AppDropdownMenuItem>);

		expect(screen.getByTestId("app-dropdown-menu-item")).toHaveAttribute("data-inset", "true");
	});

	it("forwards other props", () => {
		render(
			<AppDropdownMenuItem className="custom-class" onClick={() => {}}>
				Item
			</AppDropdownMenuItem>,
		);

		expect(screen.getByTestId("app-dropdown-menu-item")).toHaveClass("custom-class");
	});
});

describe("AppDropdownMenuLabel", () => {
	it("renders label", () => {
		render(<AppDropdownMenuLabel>Section Label</AppDropdownMenuLabel>);

		expect(screen.getByTestId("dropdown-menu-label")).toBeInTheDocument();
		expect(screen.getByText("Section Label")).toBeInTheDocument();
	});
});

describe("AppDropdownMenuSeparator", () => {
	it("renders separator", () => {
		render(<AppDropdownMenuSeparator />);

		expect(screen.getByTestId("dropdown-menu-separator")).toBeInTheDocument();
	});
});

describe("AppDropdownMenuShortcut", () => {
	it("renders shortcut", () => {
		render(<AppDropdownMenuShortcut>⌘K</AppDropdownMenuShortcut>);

		expect(screen.getByTestId("dropdown-menu-shortcut")).toBeInTheDocument();
		expect(screen.getByText("⌘K")).toBeInTheDocument();
	});
});

describe("AppDropdownMenuGroup", () => {
	it("renders group with children", () => {
		render(
			<AppDropdownMenuGroup>
				<div>Group item 1</div>
				<div>Group item 2</div>
			</AppDropdownMenuGroup>,
		);

		expect(screen.getByTestId("dropdown-menu-group")).toBeInTheDocument();
		expect(screen.getByText("Group item 1")).toBeInTheDocument();
		expect(screen.getByText("Group item 2")).toBeInTheDocument();
	});
});

describe("AppDropdownMenuCheckboxItem", () => {
	it("renders checkbox item", () => {
		render(<AppDropdownMenuCheckboxItem>Checkbox item</AppDropdownMenuCheckboxItem>);

		expect(screen.getByTestId("dropdown-menu-checkbox-item")).toBeInTheDocument();
		expect(screen.getByText("Checkbox item")).toBeInTheDocument();
	});
});

describe("AppDropdownMenuRadioGroup", () => {
	it("renders radio group", () => {
		render(
			<AppDropdownMenuRadioGroup value="option1">
				<div>Radio options</div>
			</AppDropdownMenuRadioGroup>,
		);

		expect(screen.getByTestId("dropdown-menu-radio-group")).toBeInTheDocument();
		expect(screen.getByTestId("dropdown-menu-radio-group")).toHaveAttribute("value", "option1");
	});
});

describe("AppDropdownMenuRadioItem", () => {
	it("renders radio item", () => {
		render(<AppDropdownMenuRadioItem value="option1">Option 1</AppDropdownMenuRadioItem>);

		expect(screen.getByTestId("dropdown-menu-radio-item")).toBeInTheDocument();
		expect(screen.getByTestId("dropdown-menu-radio-item")).toHaveAttribute("value", "option1");
	});
});

describe("AppDropdownMenuSub", () => {
	it("renders sub menu", () => {
		render(
			<AppDropdownMenuSub>
				<div>Sub menu content</div>
			</AppDropdownMenuSub>,
		);

		expect(screen.getByTestId("dropdown-menu-sub")).toBeInTheDocument();
		expect(screen.getByText("Sub menu content")).toBeInTheDocument();
	});
});

describe("AppDropdownMenuSubTrigger", () => {
	it("renders sub trigger", () => {
		render(<AppDropdownMenuSubTrigger>More options</AppDropdownMenuSubTrigger>);

		expect(screen.getByTestId("dropdown-menu-sub-trigger")).toBeInTheDocument();
		expect(screen.getByText("More options")).toBeInTheDocument();
	});
});

describe("AppDropdownMenuSubContent", () => {
	it("renders sub content", () => {
		render(<AppDropdownMenuSubContent>Sub menu items</AppDropdownMenuSubContent>);

		expect(screen.getByTestId("dropdown-menu-sub-content")).toBeInTheDocument();
		expect(screen.getByText("Sub menu items")).toBeInTheDocument();
	});
});

describe("DangerMenuItem", () => {
	it("renders with danger styling and testid", () => {
		render(<DangerMenuItem>Delete</DangerMenuItem>);

		const item = screen.getByTestId("danger-menu-item");
		expect(item).toBeInTheDocument();
		expect(item).toHaveAttribute("data-variant", "destructive");
		expect(item).toHaveClass("text-destructive");
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("applies custom className alongside danger styling", () => {
		render(<DangerMenuItem className="custom-danger">Delete</DangerMenuItem>);

		const item = screen.getByTestId("danger-menu-item");
		expect(item).toHaveClass("text-destructive", "custom-danger");
	});

	it("forwards other props", () => {
		const onClick = vi.fn();
		render(
			<DangerMenuItem disabled onClick={onClick}>
				Delete
			</DangerMenuItem>,
		);

		expect(screen.getByTestId("danger-menu-item")).toHaveAttribute("disabled", "");
	});

	it("renders complex children", () => {
		render(
			<DangerMenuItem>
				<span>🗑️</span>
				<span>Delete item</span>
			</DangerMenuItem>,
		);

		const item = screen.getByTestId("danger-menu-item");
		expect(item).toHaveTextContent("🗑️Delete item");
	});
});
