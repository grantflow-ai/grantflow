import { describe, expect, it, vi } from "vitest";

import { createTraceHeaders, generateTraceId, logTraceEvent } from "./tracing";

vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

import { log } from "@/utils/logger";

const mockLog = vi.mocked(log);

describe("Tracing Utilities", () => {
	describe("generateTraceId", () => {
		it("should generate a valid UUID", () => {
			const traceId = generateTraceId();

			expect(traceId).toEqual(expect.any(String));
			expect(traceId.length).toBe(36);
			expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		});

		it("should generate unique IDs", () => {
			const id1 = generateTraceId();
			const id2 = generateTraceId();

			expect(id1).not.toBe(id2);
		});
	});

	describe("createTraceHeaders", () => {
		it("should create correct trace headers", () => {
			const traceId = "test-trace-id";
			const operation = "test-operation";

			const headers = createTraceHeaders(traceId, operation);

			expect(headers).toEqual({
				"X-Operation": operation,
				"X-Service": "frontend",
				"X-Trace-ID": traceId,
				"X-Trace-Timestamp": expect.any(String),
			});

			expect(new Date(headers["X-Trace-Timestamp"]).toISOString()).toBe(headers["X-Trace-Timestamp"]);
		});
	});

	describe("logTraceEvent", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("should call logTrace with correct parameters", () => {
			const traceId = "test-trace-id";
			const operation = "test-operation";
			const step = "test-step";
			const metadata = { key: "value" };

			logTraceEvent(traceId, operation, step, metadata);

			expect(mockLog.info).toHaveBeenCalledWith(`${traceId} | ${operation} | ${step}`, {
				operation,
				service: "frontend",
				step,
				trace_id: traceId,
				...metadata,
			});
		});

		it("should work without metadata", () => {
			const traceId = "test-trace-id";
			const operation = "test-operation";
			const step = "test-step";

			logTraceEvent(traceId, operation, step);

			expect(mockLog.info).toHaveBeenCalledWith(`${traceId} | ${operation} | ${step}`, {
				operation,
				service: "frontend",
				step,
				trace_id: traceId,
			});
		});
	});
});
