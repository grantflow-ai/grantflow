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
