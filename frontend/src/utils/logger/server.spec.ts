import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock transports so tests don't require real env/IO
vi.mock("@loglayer/transport-simple-pretty-terminal", () => ({
	getSimplePrettyTerminal: () => ({}) as any,
}));
vi.mock("@google-cloud/pino-logging-gcp-config", () => ({
	createGcpLoggingPinoConfig: () => ({ level: "info" }),
}));

describe("logger/server", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("getLogger returns a singleton instance", async () => {
		const mod = await import("./server");
		const logger1 = mod.getLogger();
		const logger2 = mod.getLogger();
		expect(logger2).toBe(logger1);
	});

	it("log facade delegates warn to underlying logger", async () => {
		const mod = await import("./server");
		const logger = mod.getLogger() as any;
		const chainedWarn = vi.fn();
		const spyWithMeta = vi.spyOn(logger, "withMetadata").mockReturnValue({ warn: chainedWarn } as any);
		mod.log.warn("careful", { traceId: "x" } as any);
		expect(spyWithMeta).toHaveBeenCalledWith({ traceId: "x" });
		expect(chainedWarn).toHaveBeenCalledWith("careful");
	});

	it("log facade warn without context calls logger.warn directly", async () => {
		const mod = await import("./server");
		const logger = mod.getLogger() as any;
		const spyWarn = vi.spyOn(logger, "warn");
		mod.log.warn("noc");
		expect(spyWarn).toHaveBeenCalledWith("noc");
	});
});
