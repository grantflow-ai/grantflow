import { log } from "@/utils/logger/client";

export function createTraceHeaders(traceId: string, operation: string): Record<string, string> {
	return {
		"X-Operation": operation,
		"X-Service": "frontend",
		"X-Trace-ID": traceId,
		"X-Trace-Timestamp": new Date().toISOString(),
	};
}

export function generateTraceId(): string {
	return crypto.randomUUID();
}

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
