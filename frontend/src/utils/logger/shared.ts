import type { ILogLayer } from "loglayer";

export type LogContext = { traceId?: string } & Record<string, unknown>;

export function createLogFacade(getLogger: () => ILogLayer) {
	return {
		error(message: string, error?: unknown, context?: LogContext): void {
			const meta = toMetadata(context);
			if (error instanceof Error) {
				if (meta) {
					getLogger().withError(error).withMetadata(meta).error(message);
				} else {
					getLogger().withError(error).error(message);
				}
				return;
			}
			let merged: Record<string, unknown> | undefined;
			if (meta) {
				merged = { ...meta, error };
			} else if (error !== undefined) {
				merged = { error } as Record<string, unknown>;
			}
			if (merged) {
				getLogger().withMetadata(merged).error(message);
			} else {
				getLogger().error(message);
			}
		},
		info(message: string, context?: LogContext): void {
			const meta = toMetadata(context);
			if (meta) {
				getLogger().withMetadata(meta).info(message);
			} else {
				getLogger().info(message);
			}
		},
		warn(message: string, context?: LogContext): void {
			const meta = toMetadata(context);
			if (meta) {
				getLogger().withMetadata(meta).warn(message);
			} else {
				getLogger().warn(message);
			}
		},
	};
}

function toMetadata(context?: LogContext): Record<string, unknown> | undefined {
	if (!context) {
		return undefined;
	}
	return { ...context } as Record<string, unknown>;
}
