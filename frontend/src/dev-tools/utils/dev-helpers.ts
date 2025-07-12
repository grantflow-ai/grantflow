/**
 * Centralized development utilities and helpers
 * Keep all dev/mock logic consolidated here
 */

import { isMockAPIEnabled } from "@/dev-tools";
import { getMockAPIEnabled } from "@/utils/env";
import { log } from "@/utils/logger";

/**
 * Get mock WebSocket URL for development
 */
export function getMockWebSocketUrl(projectId: string, applicationId: string): string {
	return `ws://localhost:3001/projects/${projectId}/applications/${applicationId}/notifications?otp=mock-otp`;
}

/**
 * Check if the application is running in development mode with mock API
 */
export function isDevModeWithMockAPI(): boolean {
	return getMockAPIEnabled() && isMockAPIEnabled();
}

/**
 * Check if request should skip logging in dev mode
 */
export function shouldSkipLogging(): boolean {
	return getMockAPIEnabled();
}

/**
 * Trigger WebSocket scenario in mock mode (for stores)
 */
export async function triggerMockWebSocketScenario(
	applicationId: string,
	scenarioName: "grant-application-generation" | "grant-template-generation",
): Promise<void> {
	if (!isDevModeWithMockAPI()) {
		return;
	}

	log.info(`Manually triggering ${scenarioName} WebSocket scenario in mock mode`, {
		applicationId,
	});

	setTimeout(() => {
		void (async () => {
			try {
				const { triggerWebSocketScenario } = await import("../mock-api/websocket");
				triggerWebSocketScenario(applicationId, scenarioName);
			} catch (error) {
				log.error("Failed to trigger mock WebSocket scenario", {
					applicationId,
					error: error instanceof Error ? error.message : String(error),
					scenarioName,
				});
			}
		})();
	}, 100);
}
