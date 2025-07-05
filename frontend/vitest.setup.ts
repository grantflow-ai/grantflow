import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock window.matchMedia
window.matchMedia = vi.fn().mockImplementation((query) => ({
	addEventListener: vi.fn(),
	addListener: vi.fn(),
	dispatchEvent: vi.fn(() => false),
	matches: false,
	media: query,
	onchange: null,
	removeEventListener: vi.fn(),
	removeListener: vi.fn(),
}));

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
	cleanup();
});
