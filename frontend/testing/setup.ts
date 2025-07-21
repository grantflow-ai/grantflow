import "@testing-library/react";
import "./ky-mock"; // Set up ky mock before other imports

import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import * as matchers from "@testing-library/jest-dom/matchers";

declare module "vitest" {
	// @ts-ignore
	type Assertion<T> = TestingLibraryMatchers<T, void>;
}

expect.extend(matchers);

// Mock Radix UI Select components to work in JSDOM
vi.mock("@/components/ui/select", async () => {
	const mocks = await import("./radix-ui-mocks");
	return {
		Select: mocks.Select,
		SelectContent: mocks.SelectContent,
		SelectItem: mocks.SelectItem,
		SelectTrigger: mocks.SelectTrigger,
		SelectValue: mocks.SelectValue,
	};
});

// Mock Radix UI DropdownMenu components to work in JSDOM
vi.mock("@/components/ui/dropdown-menu", async () => {
	const mocks = await import("./radix-ui-mocks");
	return {
		DropdownMenu: mocks.DropdownMenu,
		DropdownMenuCheckboxItem: mocks.DropdownMenuCheckboxItem,
		DropdownMenuContent: mocks.DropdownMenuContent,
		DropdownMenuGroup: mocks.DropdownMenuGroup,
		DropdownMenuItem: mocks.DropdownMenuItem,
		DropdownMenuLabel: mocks.DropdownMenuLabel,
		DropdownMenuRadioGroup: mocks.DropdownMenuRadioGroup,
		DropdownMenuRadioItem: mocks.DropdownMenuRadioItem,
		DropdownMenuSeparator: mocks.DropdownMenuSeparator,
		DropdownMenuShortcut: mocks.DropdownMenuShortcut,
		DropdownMenuSub: mocks.DropdownMenuSub,
		DropdownMenuSubContent: mocks.DropdownMenuSubContent,
		DropdownMenuSubTrigger: mocks.DropdownMenuSubTrigger,
		DropdownMenuTrigger: mocks.DropdownMenuTrigger,
	};
});

beforeAll(() => {
	// @ts-ignore
	globalThis.IS_REACT_ACT_ENVIRONMENT = false;

	// Mock pointer capture methods
	HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
	HTMLElement.prototype.setPointerCapture = vi.fn();
	HTMLElement.prototype.releasePointerCapture = vi.fn();

	// Mock window.location.reload
	const originalLocation = globalThis.location;
	Object.defineProperty(globalThis, "location", {
		configurable: true,
		value: Object.assign({}, originalLocation, {
			reload: vi.fn(),
		}),
		writable: true,
	});

	// Mock scrollIntoView
	HTMLElement.prototype.scrollIntoView = vi.fn();

	// Mock ResizeObserver for floating-ui compatibility
	globalThis.ResizeObserver = class ResizeObserver {
		disconnect = vi.fn();
		observe = vi.fn();
		unobserve = vi.fn();
	};

	// Mock crypto.randomUUID for tracing - ensure crypto exists
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!globalThis.crypto) {
		globalThis.crypto = {} as Crypto;
	}

	// Generate unique UUIDs for tests that match the expected hexadecimal format
	let uuidCounter = 0;
	globalThis.crypto.randomUUID = vi.fn((): `${string}-${string}-${string}-${string}-${string}` => {
		const counter = (++uuidCounter).toString(16).padStart(12, "0");
		return `${counter.slice(0, 8)}-${counter.slice(8, 12)}-4000-8000-${counter.padEnd(12, "0")}` as `${string}-${string}-${string}-${string}-${string}`;
	});
});

vi.mock("react", async (importOriginal) => {
	const originalModule = await importOriginal<typeof import("react")>();
	return {
		...originalModule,
		cache: <T extends (...args: unknown[]) => unknown>(func: T) => func,
	};
});
