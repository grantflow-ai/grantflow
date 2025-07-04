/**
 * Temporary debug logging function - TO BE REMOVED LATER
 * @param message - The debug message
 * @param data - Optional data to log
 */
export function logDebug(message: string, data?: unknown): void {
	console.log(`[DEBUG] ${message}`, data ?? "");
}

/**
 * Logs an error to the error console.
 *
 * This is the only place we allow this.
 */
export function logError({ error, identifier }: { error: unknown; identifier: string }): void {
	const message = error instanceof Error ? error.message : JSON.stringify(error);

	console.error(`${identifier}: ${message}`);
}

/**
 * Logs a structured trace event for distributed tracing.
 */
export function logTrace(level: "error" | "info", message: string, metadata: Record<string, unknown>): void {
	const logData = {
		...metadata,
		timestamp: new Date().toISOString(),
	};

	if (level === "error") {
		console.error(`[TRACE] ${message}`, logData);
	} else {
		console.log(`[TRACE] ${message}`, logData);
	}
}