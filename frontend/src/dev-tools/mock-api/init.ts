/**
 * Mock API initialization
 * This module handles the setup of mock API infrastructure in development mode
 */

import { isMockAPIEnabled } from "./client";
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

	console.log("[Mock API] Initializing mock development environment");

	// Initialize WebSocket mocking
	initializeWebSocketMocking();

	// Register all mock handlers
	registerMockHandlers();

	console.log("[Mock API] Mock development environment ready");
}

/**
 * Check if mock API is enabled and log status
 */
export function logMockAPIStatus(): void {
	const isEnabled = isMockAPIEnabled();
	console.log(`[Mock API] Status: ${isEnabled ? "ENABLED" : "DISABLED"}`);

	if (isEnabled) {
		console.log("[Mock API] Running in development mode with mock backend");
	}
}
