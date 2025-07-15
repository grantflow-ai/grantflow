/**
 * Mock API initialization
 * This module handles the setup of mock API infrastructure in development mode
 */

import { isMockAPIEnabled } from "./client";
import { clearAllMockStores } from "./handlers";
import { registerMockHandlers } from "./register";
import { initializeWebSocketMocking } from "./websocket";

/**
 * Initialize all mock API components
 * This should be called early in the application lifecycle when in development mode
 */
export function initializeMockAPI(): void {
	if (!isMockAPIEnabled()) {
		return;
	}

	initializeWebSocketMocking();

	registerMockHandlers();

	// Make clearAllMockStores available globally for tests
	if (typeof globalThis.window !== "undefined") {
		(globalThis as any).clearAllMockStores = clearAllMockStores; // eslint-disable-line @typescript-eslint/no-unsafe-member-access

		// Make mock API client available globally for tests
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { getMockAPIClient } = require("./client.js");
		(globalThis as any).getMockAPIClient = getMockAPIClient; // eslint-disable-line @typescript-eslint/no-unsafe-member-access
	}
}

/**
 * Check if mock API is enabled and log status
 */
export function logMockAPIStatus(): void {
	// ~keep Mock API status logging - replaced with structured logging
}
