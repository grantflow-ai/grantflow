import { createGcpLoggingPinoConfig } from "@google-cloud/pino-logging-gcp-config";
import { PinoTransport } from "@loglayer/transport-pino";
import { getSimplePrettyTerminal } from "@loglayer/transport-simple-pretty-terminal";
import { type ILogLayer, LogLayer, type PluginBeforeMessageOutParams } from "loglayer";
import * as Pino from "pino";
import { serializeError } from "serialize-error";
import { createLogFacade } from "./shared";

let singleton: ILogLayer | null = null;

export function getLogger(): ILogLayer {
	singleton ??= initLogger();
	return singleton;
}

function initLogger(): ILogLayer {
	const pinoLogger: ReturnType<typeof Pino.pino> = (
		process.env.NODE_ENV === "production"
			? Pino.pino(createGcpLoggingPinoConfig(undefined, { level: "info" }))
			: Pino.pino({ level: "info" })
	) as ReturnType<typeof Pino.pino>;

	const logger = new LogLayer({
		errorSerializer: serializeError,
		plugins: [
			{
				onBeforeMessageOut(params: PluginBeforeMessageOutParams, _log: ILogLayer): unknown[] {
					if (params.messages.length > 0 && typeof params.messages[0] === "string") {
						params.messages[0] = `[Server] ${params.messages[0]}`;
					}
					return params.messages;
				},
			},
		],
		transport: [
			getSimplePrettyTerminal({
				enabled: process.env.NODE_ENV === "development",
				runtime: "node",
				viewMode: "inline",
			}),
			new PinoTransport({
				enabled: process.env.NODE_ENV === "production",
				logger: pinoLogger,
			}),
		],
	});

	logger.withContext({ app: "frontend", env: process.env.NODE_ENV, isServer: true });
	return logger;
}

export const log = createLogFacade(getLogger);
