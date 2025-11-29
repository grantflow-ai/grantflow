import { beforeEach, describe, expect, it } from "vitest";
import { createLogFacade, type LogContext } from "./shared";

class FakeLogger {
	public calls: { error?: any; level: string; message: string; meta?: Record<string, unknown> }[] = [];
	public err?: unknown;
	public meta: Record<string, unknown> | undefined;

	error(message: string) {
		const call: { error?: unknown; level: string; message: string; meta?: Record<string, unknown> } = {
			level: "error",
			message,
		};
		if (this.err !== undefined) call.error = this.err;
		if (this.meta !== undefined) call.meta = this.meta;
		this.calls.push(call);
		this.meta = undefined;
		this.err = undefined;
	}

	info(message: string) {
		const call: { level: string; message: string; meta?: Record<string, unknown> } = {
			level: "info",
			message,
		};
		if (this.meta !== undefined) call.meta = this.meta;
		this.calls.push(call);
		this.meta = undefined;
	}

	warn(message: string) {
		const call: { level: string; message: string; meta?: Record<string, unknown> } = {
			level: "warn",
			message,
		};
		if (this.meta !== undefined) call.meta = this.meta;
		this.calls.push(call);
		this.meta = undefined;
	}

	withError(error: any) {
		this.err = error;
		return this;
	}

	withMetadata(meta: Record<string, unknown>) {
		this.meta = meta;
		return this;
	}
}

describe("createLogFacade", () => {
	let fake: FakeLogger;
	const getLogger = () => fake as unknown as any;
	const facade = createLogFacade(getLogger);

	beforeEach(() => {
		fake = new FakeLogger();
	});

	it("info without context should call .info with no metadata", () => {
		facade.info("hello");
		expect(fake.calls).toEqual([{ level: "info", message: "hello" }]);
	});

	it("info with context should pass metadata", () => {
		const ctx: LogContext = { traceId: "t1", userId: "u1" } as any;
		facade.info("hello", ctx);
		expect(fake.calls[0]).toMatchObject({ level: "info", meta: { traceId: "t1", userId: "u1" } });
	});

	it("warn with context should pass metadata", () => {
		const ctx: LogContext = { requestId: "r1" } as any;
		facade.warn("be careful", ctx);
		expect(fake.calls[0]).toMatchObject({ level: "warn", meta: { requestId: "r1" } });
	});

	it("error with Error and metadata should use withError and withMetadata", () => {
		const err = new Error("boom");
		const ctx: LogContext = { traceId: "t2" } as any;
		facade.error("failed", err, ctx);
		expect(fake.calls[0]).toMatchObject({ error: err, level: "error", message: "failed", meta: { traceId: "t2" } });
	});

	it("error with non-Error value and metadata should merge into metadata", () => {
		facade.error("failed", { code: 500 }, { traceId: "t3" } as any);
		expect(fake.calls[0]).toMatchObject({
			level: "error",
			meta: { error: { code: 500 }, traceId: "t3" },
		});
	});

	it("error with only non-Error value should send error field", () => {
		facade.error("failed", { reason: "oops" });
		expect(fake.calls[0]).toMatchObject({ level: "error", meta: { error: { reason: "oops" } } });
	});

	it("error without error/context should just call error(message)", () => {
		facade.error("just-message");
		expect(fake.calls[0]).toEqual({ level: "error", message: "just-message" });
	});
});
