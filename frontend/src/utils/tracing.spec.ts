import { describe, expect, it, vi } from "vitest";

import { createTraceHeaders, generateCorrelationId, logTraceEvent } from "./tracing";

vi.mock("@/utils/logging", () => ({
	logTrace: vi.fn(),
}));

import { logTrace } from "@/utils/logging";

const mockLogTrace = vi.mocked(logTrace);

describe("Tracing Utilities", () => {
	describe("generateCorrelationId", () => {
		it("should generate a valid UUID", () => {
			const correlationId = generateCorrelationId();

			expect(correlationId).toEqual(expect.any(String));
			expect(correlationId.length).toBe(36);
			expect(correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		});

		it("should generate unique IDs", () => {
			const id1 = generateCorrelationId();
			const id2 = generateCorrelationId();

			expect(id1).not.toBe(id2);
		});
	});

	describe("createTraceHeaders", () => {
		it("should create correct trace headers", () => {
			const correlationId = "test-correlation-id";
			const operation = "test-operation";

			const headers = createTraceHeaders(correlationId, operation);

			expect(headers).toEqual({
				"X-Correlation-ID": correlationId,
				"X-Operation": operation,
				"X-Service": "frontend",
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
			const correlationId = "test-correlation-id";
			const operation = "test-operation";
			const step = "test-step";
			const metadata = { key: "value" };

			logTraceEvent(correlationId, operation, step, metadata);

			expect(mockLogTrace).toHaveBeenCalledWith("info", `${correlationId} | ${operation} | ${step}`, {
				correlation_id: correlationId,
				operation,
				service: "frontend",
				step,
				...metadata,
			});
		});

		it("should work without metadata", () => {
			const correlationId = "test-correlation-id";
			const operation = "test-operation";
			const step = "test-step";

			logTraceEvent(correlationId, operation, step);

			expect(mockLogTrace).toHaveBeenCalledWith("info", `${correlationId} | ${operation} | ${step}`, {
				correlation_id: correlationId,
				operation,
				service: "frontend",
				step,
			});
		});
	});
});
