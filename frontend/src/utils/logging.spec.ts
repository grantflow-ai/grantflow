import { describe, expect, it, vi } from "vitest";

import { logError, logTrace } from "./logging";


const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

describe("Logging Utilities", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("logError", () => {
		it("should log error with identifier", () => {
			const error = new Error("Test error");
			const identifier = "test-identifier";

			logError({ error, identifier });

			expect(mockConsoleError).toHaveBeenCalledWith(`${identifier}: Test error`);
		});

		it("should handle non-Error objects", () => {
			const error = { message: "Not an error object" };
			const identifier = "test-identifier";

			logError({ error, identifier });

			expect(mockConsoleError).toHaveBeenCalledWith(`${identifier}: ${JSON.stringify(error)}`);
		});
	});

	describe("logTrace", () => {
		it("should log info level trace events", () => {
			const message = "Test trace message";
			const metadata = { key: "value", number: 123 };

			logTrace("info", message, metadata);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				`[TRACE] ${message}`,
				expect.objectContaining({
					...metadata,
					timestamp: expect.any(String),
				}),
			);

			
			const [, logData] = mockConsoleLog.mock.calls[0] as [string, Record<string, unknown>];
			expect(new Date(logData.timestamp as string).toISOString()).toBe(logData.timestamp);
		});

		it("should log error level trace events", () => {
			const message = "Test error trace message";
			const metadata = { error: "Something went wrong" };

			logTrace("error", message, metadata);

			expect(mockConsoleError).toHaveBeenCalledWith(
				`[TRACE] ${message}`,
				expect.objectContaining({
					...metadata,
					timestamp: expect.any(String),
				}),
			);
		});

		it("should include timestamp in metadata", () => {
			const message = "Test message";
			const metadata = { key: "value" };

			logTrace("info", message, metadata);

			const [, logData] = mockConsoleLog.mock.calls[0] as [string, Record<string, unknown>];

			expect(logData).toHaveProperty("timestamp");
			expect(logData).toHaveProperty("key", "value");
		});
	});
});
