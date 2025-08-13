import { PinoTransport } from "@loglayer/transport-pino";
import { getSimplePrettyTerminal } from "@loglayer/transport-simple-pretty-terminal";
import { type ILogLayer, LogLayer } from "loglayer";
import pino from "pino";
import { serializeError } from "serialize-error";

export function register(): void {
	const logger = new LogLayer({
		errorSerializer: serializeError,
		transport: [
			getSimplePrettyTerminal({
				enabled: process.env.NODE_ENV === "development",
				runtime: "node",
				viewMode: "inline",
			}),
			new PinoTransport({
				enabled: process.env.NODE_ENV === "production",
				logger: pino(),
			}),
		],
	});

	if (process.env.NEXT_RUNTIME === "nodejs") {
		console.error = createConsoleMethod(logger, "error");
		console.log = createConsoleMethod(logger, "log");
		console.info = createConsoleMethod(logger, "info");
		console.warn = createConsoleMethod(logger, "warn");
		console.debug = createConsoleMethod(logger, "debug");
	}
}

function createConsoleMethod(log: ILogLayer, method: "debug" | "error" | "info" | "log" | "warn") {
	const mapped: "debug" | "error" | "info" | "warn" = method === "log" ? "info" : method;
	return (...args: unknown[]) => {
		const { data, error, messages } = parseConsoleArgs(args);
		const finalMessage = finalizeMessage(messages, error);
		emitToLogger(log, mapped, finalMessage, error, data);
	};
}

function emitToLogger(
	log: ILogLayer,
	level: "debug" | "error" | "info" | "warn",
	finalMessage: string,
	error: Error | null,
	data: null | Record<string, unknown>,
): void {
	if (error && data && finalMessage) {
		log.withError(error).withMetadata(data)[level](finalMessage);
		return;
	}
	if (error && finalMessage) {
		log.withError(error)[level](finalMessage);
		return;
	}
	if (data && finalMessage) {
		log.withMetadata(data)[level](finalMessage);
		return;
	}
	if (error && data && !finalMessage) {
		log.withError(error).withMetadata(data)[level]("");
		return;
	}
	if (error && !finalMessage) {
		log.errorOnly(error);
		return;
	}
	if (data && !finalMessage) {
		log.metadataOnly(data);
		return;
	}
	log[level](finalMessage);
}

function finalizeMessage(messages: string[], error: Error | null): string {
	const msg = stripAnsiCodes(messages.join(" ")).trim();
	if (msg === "⨯" && error) {
		return error.message || "";
	}
	return msg;
}

function parseConsoleArgs(args: unknown[]): {
	data: null | Record<string, unknown>;
	error: Error | null;
	messages: string[];
} {
	const data: Record<string, unknown> = {};
	let hasData = false;
	let error: Error | null = null;
	const messages: string[] = [];
	for (const arg of args) {
		if (arg instanceof Error) {
			error = arg;
			continue;
		}
		if (typeof arg === "object" && arg !== null) {
			Object.assign(data, arg);
			hasData = true;
			continue;
		}
		if (typeof arg === "string") {
			messages.push(arg);
		}
	}
	return { data: hasData ? data : null, error, messages };
}

function stripAnsiCodes(str: string): string {
	let out = "";
	const len = str.length;
	let i = 0;
	while (i < len) {
		const cp = str.codePointAt(i) ?? 0;
		if (cp === 0x1b || cp === 0x00_9b) {
			i += 1;
			while (i < len) {
				const c = str.codePointAt(i) ?? 0;
				if ((c >= 0x40 && c <= 0x7e) || c === 0) {
					break;
				}
				i += 1;
			}
			i += 1;
			continue;
		}
		out += String.fromCodePoint(cp);
		i += cp > 0xff_ff ? 2 : 1;
	}
	return out;
}
