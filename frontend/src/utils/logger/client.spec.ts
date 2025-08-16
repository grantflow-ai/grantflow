import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@loglayer/transport-simple-pretty-terminal", () => ({
	getSimplePrettyTerminal: () => ({}) as any,
}));

describe("logger/client", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("getLogger returns a singleton instance", async () => {
		const mod = await import("./client");
		const logger1 = mod.getLogger();
		const logger2 = mod.getLogger();
		expect(logger2).toBe(logger1);
	});

	it("log facade delegates info to underlying logger", async () => {
		const mod = await import("./client");
		const logger = mod.getLogger() as any;
		const chainedInfo = vi.fn();
		const spyWithMeta = vi.spyOn(logger, "withMetadata").mockReturnValue({ info: chainedInfo } as any);
		mod.log.info("msg", { traceId: "t1" } as any);
		expect(spyWithMeta).toHaveBeenCalledWith({ traceId: "t1" });
		expect(chainedInfo).toHaveBeenCalledWith("msg");
	});

	it("log facade info without context calls logger.info directly", async () => {
		const mod = await import("./client");
		const logger = mod.getLogger() as any;
		const spyInfo = vi.spyOn(logger, "info");
		mod.log.info("noctx");
		expect(spyInfo).toHaveBeenCalledWith("noctx");
	});
});
