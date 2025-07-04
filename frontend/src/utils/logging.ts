/**
 * Temporary debug logging function - TO BE REMOVED LATER
 * @param message - The debug message
 * @param data - Optional data to log
 */
export function logDebug(message: string, data?: unknown): void {
	// eslint-disable-next-line no-console
	console.log(`[DEBUG] ${message}`, data ?? "");
}

/**
 * Logs an error to the error console.
 *
 * This is the only place we allow this.
 */
export function logError({ error, identifier }: { error: unknown; identifier: string }): void {
	const message = error instanceof Error ? error.message : JSON.stringify(error);
	// eslint-disable-next-line no-console
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
		// eslint-disable-next-line no-console
		console.error(`[TRACE] ${message}`, logData);
	} else {
		// eslint-disable-next-line no-console
		console.log(`[TRACE] ${message}`, logData);
	}
}
