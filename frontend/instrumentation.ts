import { PinoTransport } from "@loglayer/transport-pino";
import { getSimplePrettyTerminal } from "@loglayer/transport-simple-pretty-terminal";
import { LogLayer } from "loglayer";
import * as Pino from "pino";
import { serializeError } from "serialize-error";
import type { LogLayerLike } from "@/utils/logger/types";

type ConsoleMethod = "debug" | "error" | "info" | "log" | "warn";
type LogLevel = Exclude<ConsoleMethod, "log">;

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
				logger: Pino.pino(),
			}),
		],
	}) as LogLayerLike;

	if (process.env.NEXT_RUNTIME === "nodejs") {
		console.error = createConsoleMethod(logger, "error");
		console.log = createConsoleMethod(logger, "log");
		console.info = createConsoleMethod(logger, "info");
		console.warn = createConsoleMethod(logger, "warn");
		console.debug = createConsoleMethod(logger, "debug");
	}
}

function callLog(log: LogLayerLike, level: LogLevel, message: string): void {
	if (level === "debug") {
		log.debug(message);
		return;
	}
	if (level === "error") {
		log.error(message);
		return;
	}
	if (level === "info") {
		log.info(message);
		return;
	}
	log.warn(message);
}

function createConsoleMethod(log: LogLayerLike, method: ConsoleMethod) {
	const mapped: LogLevel = method === "log" ? "info" : method;
	return (...args: unknown[]) => {
		const { data, error, messages } = parseConsoleArgs(args);
		const finalMessage = finalizeMessage(messages, error);
		emitToLogger(log, mapped, finalMessage, error, data);
	};
}

function emitToLogger(
	log: LogLayerLike,
	level: LogLevel,
	finalMessage: string,
	error: Error | null,
	data: null | Record<string, unknown>,
): void {
	if (error && data && finalMessage) {
		const contextualLog = log.withError(error).withMetadata(data);
		callLog(contextualLog, level, finalMessage);
		return;
	}
	if (error && finalMessage) {
		callLog(log.withError(error), level, finalMessage);
		return;
	}
	if (data && finalMessage) {
		callLog(log.withMetadata(data), level, finalMessage);
		return;
	}
	if (error && data && !finalMessage) {
		const contextualLog = log.withError(error).withMetadata(data);
		callLog(contextualLog, level, "");
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
	callLog(log, level, finalMessage);
}

function finalizeMessage(messages: string[], error: Error | null): string {
	const msg = stripAnsiCodes(messages.join(" ")).trim();
	if (msg === "⨯" && error) {
		return error.message || "";
	}
	return msg;
}

function isAnsiEscapeEnd(codePoint: number): boolean {
	return (codePoint >= 0x40 && codePoint <= 0x7e) || codePoint === 0;
}

function isAnsiEscapeStart(codePoint: number): boolean {
	return codePoint === 0x1b || codePoint === 0x00_9b;
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

function skipAnsiEscapeSequence(str: string, startIndex: number): number {
	let i = startIndex + 1;
	const len = str.length;

	while (i < len) {
		const c = str.codePointAt(i) ?? 0;
		if (isAnsiEscapeEnd(c)) {
			break;
		}
		i += 1;
	}

	return i + 1;
}

function stripAnsiCodes(str: string): string {
	let out = "";
	const len = str.length;
	let i = 0;

	while (i < len) {
		const cp = str.codePointAt(i) ?? 0;

		if (isAnsiEscapeStart(cp)) {
			i = skipAnsiEscapeSequence(str, i);
			continue;
		}

		out += String.fromCodePoint(cp);
		i += cp > 0xff_ff ? 2 : 1;
	}

	return out;
}
