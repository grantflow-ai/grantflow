/**
 * Logs an error to the error console
 */
export function logError({ error, identifier }: { error: unknown; identifier: string }): void {
	const message = error instanceof Error ? error.message : JSON.stringify(error);
	console.error(`${identifier}: ${message}`);
}
