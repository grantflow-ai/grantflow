interface LogContext {
	[key: string]: unknown;
	correlationId?: string;
}

type LogLevel = "error" | "info" | "warn";

class Logger {
	private get isDevelopment(): boolean {
		return process.env.NODE_ENV === "development";
	}

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
		if (!this.isDevelopment) return;

		const prefix = `[${level.toUpperCase()}]`;
		const contextData = context ? { ...context } : {};

		switch (level) {
			case "error": {
				console.error(prefix, message, contextData);
				break;
			}
			case "info": {
				console.info(prefix, message, contextData);
				break;
			}
			case "warn": {
				console.warn(prefix, message, contextData);
				break;
			}
		}
	}
}

export const log = new Logger();
