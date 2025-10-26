import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

import "./tiptap-mocks";

globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
	addEventListener: vi.fn(),
	addListener: vi.fn(),
	dispatchEvent: vi.fn(() => false),
	matches: false,
	media: query,
	onchange: null,
	removeEventListener: vi.fn(),
	removeListener: vi.fn(),
}));

globalThis.ResizeObserver = class ResizeObserver {
	disconnect = vi.fn();
	observe = vi.fn();
	unobserve = vi.fn();
};

afterEach(() => {
	cleanup();
});
