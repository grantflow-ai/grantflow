/**
 * Global test setup utilities
 *
 * This module provides setup functions that should be used in test files
 * to ensure proper test isolation and consistent test environment.
 */

import { beforeEach } from "vitest";
import { resetAllStores } from "./store-reset";

/**
 * Setup function for tests that need both store reset and mock clearing.
 *
 * This is the most common setup for integration tests.
 *
 * @example
 * ```typescript
 * import { setupIntegrationTests } from "::testing/test-setup";
 * import { vi } from "vitest";
 *
 * describe("Integration Tests", () => {
 *   setupIntegrationTests();
 *
 *   it("should handle user interactions", () => {
 *     // Stores are reset, mocks are cleared
 *   });
 * });
 * ```
 */
export function setupIntegrationTests(): void {
	beforeEach(async () => {
		resetAllStores();

		const { vi } = await import("vitest");
		vi.clearAllMocks();
		vi.resetAllMocks();
	});
}

/**
 * Setup function for store-based tests.
 *
 * Call this in test files that interact with Zustand stores to ensure
 * proper isolation between tests.
 *
 * @example
 * ```typescript
 * import { setupStoreTests } from "::testing/test-setup";
 *
 * describe("My Store Tests", () => {
 *   setupStoreTests();
 *
 *   it("should work correctly", () => {
 *     // Your test here - stores are automatically reset
 *   });
 * });
 * ```
 */
export function setupStoreTests(): void {
	beforeEach(() => {
		resetAllStores();
	});
}
