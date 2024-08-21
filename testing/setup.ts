import "@testing-library/react";

import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import * as matchers from "@testing-library/jest-dom/matchers";

declare module "vitest" {
	// @ts-expect-error, we are extending the Assertion type
	type Assertion<T> = TestingLibraryMatchers<T, void>;
}

expect.extend(matchers);

beforeAll(() => {
	// we need to set this to false because we get bombarded by warning about using act.
	// see: https://github.com/testing-library/react-testing-library/issues/1108

	// @ts-expect-error, we are setting a global variable that is undeclared in the global scope
	global.IS_REACT_ACT_ENVIRONMENT = false;
});

// see: https://github.com/vercel/next.js/discussions/49304
vi.mock("react", async (importOriginal) => {
	const originalModule = await importOriginal<typeof import("react")>();
	return {
		...originalModule,
		cache: <T extends (...args: unknown[]) => unknown>(func: T) => func,
	};
});
