import { createGcpLoggingPinoConfig } from "@google-cloud/pino-logging-gcp-config";
import { PinoTransport } from "@loglayer/transport-pino";
import { getSimplePrettyTerminal } from "@loglayer/transport-simple-pretty-terminal";
import { type ILogLayer, LogLayer, type PluginBeforeMessageOutParams } from "loglayer";
import { type Logger, type LoggerOptions, pino } from "pino";
import { serializeError } from "serialize-error";
import { createLogFacade } from "./shared";
import type { LogLayerLike } from "./types";

let singleton: LogLayerLike | null = null;

export function getLogger(): LogLayerLike {
	singleton ??= initLogger();
	return singleton;
}

function initLogger(): LogLayerLike {
	const pinoOptions: LoggerOptions =
		process.env.NODE_ENV === "production"
			? createGcpLoggingPinoConfig(undefined, { level: "info" })
			: { level: "info" };

	const pinoLogger: Logger = pino(pinoOptions) as Logger;

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

	const wrapLayer = (layer: ILogLayer): LogLayerLike => ({
		debug(message: string) {
			layer.debug(message);
		},
		error(message: string) {
			layer.error(message);
		},
		errorOnly(error: Error) {
			if (
				"errorOnly" in layer &&
				typeof (layer as { errorOnly?: (error: Error) => void }).errorOnly === "function"
			) {
				(layer as { errorOnly: (error: Error) => void }).errorOnly(error);
				return;
			}
			layer.error(error.message);
		},
		info(message: string) {
			layer.info(message);
		},
		metadataOnly(metadata: Record<string, unknown>) {
			if (
				"metadataOnly" in layer &&
				typeof (layer as { metadataOnly?: (metadata: Record<string, unknown>) => void }).metadataOnly ===
					"function"
			) {
				(layer as { metadataOnly: (metadata: Record<string, unknown>) => void }).metadataOnly(metadata);
				return;
			}
			layer.withMetadata(metadata);
		},
		warn(message: string) {
			layer.warn(message);
		},
		withContext(context: Record<string, unknown>) {
			return wrapLayer(layer.withContext(context) as unknown as ILogLayer);
		},
		withError(error: Error) {
			return wrapLayer(layer.withError(error) as unknown as ILogLayer);
		},
		withMetadata(metadata: Record<string, unknown>) {
			return wrapLayer(layer.withMetadata(metadata) as unknown as ILogLayer);
		},
	});

	const wrappedLogger = wrapLayer(logger);
	wrappedLogger.withContext({ app: "frontend", env: process.env.NODE_ENV, isServer: true });
	return wrappedLogger;
}

export const log = createLogFacade(getLogger);
