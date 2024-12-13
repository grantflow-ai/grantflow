/**
 * Logs an error to the error console
 */
export function logError({ error, identifier }: { error: unknown; identifier: string }): void {
	const message = error instanceof Error ? error.message : JSON.stringify(error);
	console.error(`${identifier}: ${message}`); // we might want to log this to a logging service such as Sentry, but for now this is what we use
}
