import "@testing-library/react";

import * as matchers from "@testing-library/jest-dom/matchers";

import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "vitest" {
	// @ts-ignore
	type Assertion<T> = TestingLibraryMatchers<T, void>;
}

expect.extend(matchers);

beforeAll(() => {
	// @ts-ignore
	globalThis.IS_REACT_ACT_ENVIRONMENT = false;
});

vi.mock("react", async (importOriginal) => {
	const originalModule = await importOriginal<typeof import("react")>();
	return {
		...originalModule,
		cache: <T extends (...args: unknown[]) => unknown>(func: T) => func,
	};
});

vi.mock("zustand");
