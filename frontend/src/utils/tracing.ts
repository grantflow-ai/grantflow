/**
 * Distributed tracing utilities for API layer
 */

import { log } from "@/utils/logger";

/**
 * Create trace headers for API requests
 */
export function createTraceHeaders(traceId: string, operation: string): Record<string, string> {
	return {
		"X-Operation": operation,
		"X-Service": "frontend",
		"X-Trace-ID": traceId,
		"X-Trace-Timestamp": new Date().toISOString(),
	};
}

/**
 * Generate a trace ID for tracing requests across services
 */
export function generateTraceId(): string {
	return crypto.randomUUID();
}

/**
 * Log a structured trace event
 */
export function logTraceEvent(
	traceId: string,
	operation: string,
	step: string,
	metadata?: Record<string, unknown>,
): void {
	log.info(`${traceId} | ${operation} | ${step}`, {
		operation,
		service: "frontend",
		step,
		trace_id: traceId,
		...metadata,
	});
}
