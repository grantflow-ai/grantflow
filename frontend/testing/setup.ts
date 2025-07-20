import "@testing-library/react";
import "./ky-mock"; // Set up ky mock before other imports

import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import * as matchers from "@testing-library/jest-dom/matchers";

declare module "vitest" {
	// @ts-ignore
	type Assertion<T> = TestingLibraryMatchers<T, void>;
}

expect.extend(matchers);

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
});

vi.mock("react", async (importOriginal) => {
	const originalModule = await importOriginal<typeof import("react")>();
	return {
		...originalModule,
		cache: <T extends (...args: unknown[]) => unknown>(func: T) => func,
	};
});
