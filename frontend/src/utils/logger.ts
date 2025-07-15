interface LogContext {
	[key: string]: unknown;
	traceId?: string;
}

type LogLevel = "error" | "info" | "warn";

class Logger {
	error(message: string, error?: unknown, context?: LogContext): void {
		const errorContext: LogContext = { ...context };

		if (error instanceof Error) {
			errorContext.error = {
				message: error.message,
				name: error.name,
				stack: error.stack,
			};
		} else if (error) {
			errorContext.error = error;
		}

		this.formatMessage("error", message, errorContext);
	}

	info(message: string, context?: LogContext): void {
		this.formatMessage("info", message, context);
	}

	warn(message: string, context?: LogContext): void {
		this.formatMessage("warn", message, context);
	}

	private formatMessage(level: LogLevel, message: string, context?: LogContext): void {
		const prefix = `[${level.toUpperCase()}]`;
		const contextData = context ? { ...context } : {};

		// Use JSON.stringify for better debugging visibility
		const contextString = Object.keys(contextData).length > 0 ? JSON.stringify(contextData, null, 2) : "";

		switch (level) {
			case "error": {
				console.error(prefix, message, contextString);
				break;
			}
			case "info": {
				console.info(prefix, message, contextString);
				break;
			}
			case "warn": {
				console.warn(prefix, message, contextString);
				break;
			}
		}
	}
}

export const log = new Logger();
