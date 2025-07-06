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

	initializeWebSocketMocking();

	registerMockHandlers();
}

/**
 * Check if mock API is enabled and log status
 */
export function logMockAPIStatus(): void {
	// ~keep Mock API status logging - replaced with structured logging
}
