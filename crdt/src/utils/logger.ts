import { createGcpLoggingPinoConfig } from "@google-cloud/pino-logging-gcp-config";
import type { Logger, LoggerOptions } from "pino";
import pino from "pino";
import { config } from "@/utils/config";

const loggerOptions: LoggerOptions = {
	level: "info",
	transport:
		config.NODE_ENV === "development"
			? {
					options: { colorize: true },
					target: "pino-pretty",
				}
			: undefined,
};
const productionLoggerOptions: LoggerOptions = createGcpLoggingPinoConfig(undefined, { level: "info" });

export const logger: Logger = config.NODE_ENV === "production" ? pino(productionLoggerOptions) : pino(loggerOptions);
