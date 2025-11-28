import { getSimplePrettyTerminal } from "@loglayer/transport-simple-pretty-terminal";
import { type ILogLayer, LogLayer, type PluginBeforeMessageOutParams } from "loglayer";
import { serializeError } from "serialize-error";
import { createLogFacade } from "./shared";
import type { LogLayerLike } from "./types";

let singleton: LogLayerLike | null = null;

export function getLogger(): LogLayerLike {
	singleton ??= initLogger();
	return singleton;
}

function initLogger(): LogLayerLike {
	const logger = new LogLayer({
		errorSerializer: serializeError,
		plugins: [
			{
				onBeforeMessageOut(params: PluginBeforeMessageOutParams, _log: ILogLayer): unknown[] {
					if (params.messages.length > 0 && typeof params.messages[0] === "string") {
						params.messages[0] = `[Client] ${params.messages[0]}`;
					}
					return params.messages;
				},
			},
		],
		transport: [
			getSimplePrettyTerminal({
				enabled: true,
				runtime: "browser",
				viewMode: "inline",
			}),
		],
	}) as LogLayerLike;
	logger.withContext({ app: "frontend", env: process.env.NODE_ENV, isServer: false });
	return logger;
}

export const log = createLogFacade(getLogger);
