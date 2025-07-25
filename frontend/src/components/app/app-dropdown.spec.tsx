import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, vi } from "vitest";

vi.mock("@/components/ui/dropdown-menu", () => {
	const MockComponent = ({ children, ...props }: any) => <div {...props}>{children}</div>;

	return {
		DropdownMenu: MockComponent,
		DropdownMenuCheckboxItem: MockComponent,
		DropdownMenuContent: MockComponent,
		DropdownMenuGroup: MockComponent,
		DropdownMenuItem: MockComponent,
		DropdownMenuLabel: MockComponent,
		DropdownMenuRadioGroup: MockComponent,
		DropdownMenuRadioItem: MockComponent,
		DropdownMenuSeparator: MockComponent,
		DropdownMenuShortcut: MockComponent,
		DropdownMenuSub: MockComponent,
		DropdownMenuSubContent: MockComponent,
		DropdownMenuSubTrigger: MockComponent,
		DropdownMenuTrigger: MockComponent,
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

describe.sequential("AppDropdownMenu", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders dropdown menu with children", () => {
		const { container } = render(
			<AppDropdownMenu data-testid="test-app-dropdown-menu">
				<div>Menu content</div>
			</AppDropdownMenu>,
		);

		expect(container.firstChild).toBeInTheDocument();
		expect(container).toHaveTextContent("Menu content");
	});

	it("forwards props to DropdownMenu component", () => {
		const { container } = render(
			<AppDropdownMenu data-testid="test-app-dropdown-menu-props">
				<div>Content</div>
			</AppDropdownMenu>,
		);

		const dropdownElement = container.firstChild as HTMLElement;
		expect(dropdownElement).toHaveAttribute("data-testid", "test-app-dropdown-menu-props");
	});
});

describe.sequential("AppDropdownMenuTrigger", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders trigger element", () => {
		const { container } = render(
			<AppDropdownMenuTrigger data-testid="test-app-dropdown-menu-trigger">
				<button type="button">Open Menu</button>
			</AppDropdownMenuTrigger>,
		);

		expect(container.firstChild).toBeInTheDocument();
		expect(container.querySelector("button")).toHaveTextContent("Open Menu");
	});
});

describe.sequential("AppDropdownMenuContent", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders content with children", () => {
		const { container } = render(
			<AppDropdownMenuContent data-testid="test-app-dropdown-menu-content">Menu items</AppDropdownMenuContent>,
		);

		expect(container.firstChild).toBeInTheDocument();
		expect(container).toHaveTextContent("Menu items");
	});
});

describe.sequential("AppDropdownMenuItem", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders with default variant", () => {
		const { container } = render(
			<AppDropdownMenuItem data-testid="test-app-dropdown-menu-item-1">Menu item</AppDropdownMenuItem>,
		);

		const item = container.firstChild as HTMLElement;
		expect(item).toBeInTheDocument();
		expect(item).toHaveAttribute("data-testid", "test-app-dropdown-menu-item-1");
		expect(item).toHaveTextContent("Menu item");
	});

	it("renders with custom variant", () => {
		const { container } = render(
			<AppDropdownMenuItem data-testid="test-app-dropdown-menu-item-2" variant="destructive">
				Delete item
			</AppDropdownMenuItem>,
		);

		const item = container.firstChild as HTMLElement;
		expect(item).toHaveAttribute("variant", "destructive");
		expect(item).toHaveTextContent("Delete item");
	});

	it("renders with inset prop", () => {
		const { container } = render(
			<AppDropdownMenuItem data-testid="test-app-dropdown-menu-item-3" inset={true}>
				Inset item
			</AppDropdownMenuItem>,
		);

		const item = container.firstChild as HTMLElement;
		expect(item).toBeInTheDocument();
		expect(item).toHaveTextContent("Inset item");
	});

	it("forwards other props", () => {
		const mockClick = vi.fn();
		const { container } = render(
			<AppDropdownMenuItem
				className="custom-class"
				data-testid="test-app-dropdown-menu-item-4"
				onClick={mockClick}
			>
				Item
			</AppDropdownMenuItem>,
		);

		const item = container.firstChild as HTMLElement;
		expect(item).toHaveClass("custom-class");
		expect(item).toHaveTextContent("Item");
	});
});

describe.sequential("AppDropdownMenuLabel", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders label", () => {
		const { container } = render(<AppDropdownMenuLabel>Section Label</AppDropdownMenuLabel>);

		expect(container.firstChild).toBeInTheDocument();
		expect(container).toHaveTextContent("Section Label");
	});
});

describe.sequential("AppDropdownMenuSeparator", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders separator", () => {
		const { container } = render(<AppDropdownMenuSeparator />);

		expect(container.firstChild).toBeInTheDocument();
	});
});

describe.sequential("AppDropdownMenuShortcut", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders shortcut", () => {
		const { container } = render(<AppDropdownMenuShortcut>⌘K</AppDropdownMenuShortcut>);

		expect(container.firstChild).toBeInTheDocument();
		expect(container).toHaveTextContent("⌘K");
	});
});

describe.sequential("AppDropdownMenuGroup", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders group with children", () => {
		const { container } = render(
			<AppDropdownMenuGroup>
				<div>Group item 1</div>
				<div>Group item 2</div>
			</AppDropdownMenuGroup>,
		);

		expect(container.firstChild).toBeInTheDocument();
		expect(container).toHaveTextContent("Group item 1Group item 2");
	});
});

describe.sequential("AppDropdownMenuCheckboxItem", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders checkbox item", () => {
		const { container } = render(
			<AppDropdownMenuCheckboxItem data-testid="test-app-dropdown-menu-checkbox-item">
				Checkbox item
			</AppDropdownMenuCheckboxItem>,
		);

		expect(container.firstChild).toBeInTheDocument();
		expect(container).toHaveTextContent("Checkbox item");
	});
});

describe.sequential("AppDropdownMenuRadioGroup", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders radio group", () => {
		const { container } = render(
			<AppDropdownMenuRadioGroup data-testid="test-app-dropdown-menu-radio-group" value="option1">
				<div>Radio options</div>
			</AppDropdownMenuRadioGroup>,
		);

		const radioGroup = container.firstChild as HTMLElement;
		expect(radioGroup).toBeInTheDocument();
		expect(radioGroup).toHaveAttribute("value", "option1");
		expect(container).toHaveTextContent("Radio options");
	});
});

describe.sequential("AppDropdownMenuRadioItem", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders radio item", () => {
		const { container } = render(
			<AppDropdownMenuRadioItem data-testid="test-app-dropdown-menu-radio-item" value="option1">
				Option 1
			</AppDropdownMenuRadioItem>,
		);

		const radioItem = container.firstChild as HTMLElement;
		expect(radioItem).toBeInTheDocument();
		expect(radioItem).toHaveAttribute("value", "option1");
		expect(container).toHaveTextContent("Option 1");
	});
});

describe.sequential("AppDropdownMenuSub", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders sub menu", () => {
		const { container } = render(
			<AppDropdownMenuSub data-testid="test-app-dropdown-menu-sub">
				<div>Sub menu content</div>
			</AppDropdownMenuSub>,
		);

		expect(container.firstChild).toBeInTheDocument();
		expect(container).toHaveTextContent("Sub menu content");
	});
});

describe.sequential("AppDropdownMenuSubTrigger", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders sub trigger", () => {
		const { container } = render(
			<AppDropdownMenuSubTrigger data-testid="test-app-dropdown-menu-sub-trigger">
				More options
			</AppDropdownMenuSubTrigger>,
		);

		expect(container.firstChild).toBeInTheDocument();
		expect(container).toHaveTextContent("More options");
	});
});

describe.sequential("AppDropdownMenuSubContent", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders sub content", () => {
		const { container } = render(
			<AppDropdownMenuSubContent data-testid="test-app-dropdown-menu-sub-content">
				Sub menu items
			</AppDropdownMenuSubContent>,
		);

		expect(container.firstChild).toBeInTheDocument();
		expect(container).toHaveTextContent("Sub menu items");
	});
});

describe.sequential("DangerMenuItem", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders with danger styling and testid", () => {
		const { container } = render(<DangerMenuItem>Delete</DangerMenuItem>);

		const item = container.firstChild as HTMLElement;
		expect(item).toBeInTheDocument();
		expect(item).toHaveAttribute("data-testid", "danger-menu-item");
		expect(item).toHaveAttribute("variant", "destructive");
		expect(container).toHaveTextContent("Delete");
	});

	it("applies custom className alongside danger styling", () => {
		const { container } = render(<DangerMenuItem className="custom-danger">Delete</DangerMenuItem>);

		const item = container.firstChild as HTMLElement;
		expect(item).toHaveClass("text-destructive", "custom-danger");
		expect(container).toHaveTextContent("Delete");
	});

	it("forwards other props", () => {
		const mockClick = vi.fn();
		const { container } = render(
			<DangerMenuItem data-custom="test" onClick={mockClick}>
				Delete
			</DangerMenuItem>,
		);

		const item = container.firstChild as HTMLElement;
		expect(item).toHaveAttribute("data-custom", "test");
	});

	it("renders complex children", () => {
		const { container } = render(
			<DangerMenuItem>
				<span>Delete</span>
				<span>Item</span>
			</DangerMenuItem>,
		);

		expect(container).toHaveTextContent("DeleteItem");
		expect(container.querySelector("span")).toBeInTheDocument();
	});
});
