/**
 * Distributed tracing utilities for API layer
 */

import { log } from "@/utils/logger";

/**
 * Create trace headers for API requests
 */
export function createTraceHeaders(correlationId: string, operation: string): Record<string, string> {
	return {
		"X-Correlation-ID": correlationId,
		"X-Operation": operation,
		"X-Service": "frontend",
		"X-Trace-Timestamp": new Date().toISOString(),
	};
}

/**
 * Generate a correlation ID for tracing requests across services
 */
export function generateCorrelationId(): string {
	return crypto.randomUUID();
}

/**
 * Log a structured trace event
 */
export function logTraceEvent(
	correlationId: string,
	operation: string,
	step: string,
	metadata?: Record<string, unknown>,
): void {
	log.info(`${correlationId} | ${operation} | ${step}`, {
		correlation_id: correlationId,
		operation,
		service: "frontend",
		step,
		...metadata,
	});
}
