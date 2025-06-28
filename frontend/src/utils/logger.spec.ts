import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { log } from "./logger";

describe("Logger", () => {
	const originalEnv = process.env.NODE_ENV;
	const consoleSpy: {
		error: MockInstance;
		info: MockInstance;
		warn: MockInstance;
	} = {
		error: vi.spyOn(console, "error").mockImplementation(),
		info: vi.spyOn(console, "info").mockImplementation(),
		warn: vi.spyOn(console, "warn").mockImplementation(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	describe("in development mode", () => {
		beforeEach(() => {
			process.env.NODE_ENV = "development";
		});

		it("should log error messages with context", () => {
			const error = new Error("Test error");
			const context = { action: "test", userId: "123" };

			log.error("Test error message", error, context);

			expect(consoleSpy.error).toHaveBeenCalledWith("[ERROR]", "Test error message", {
				action: "test",
				error: {
					message: "Test error",
					name: "Error",
					stack: expect.any(String),
				},
				userId: "123",
			});
		});

		it("should log info messages with context", () => {
			const context = { operation: "save", status: "success" };

			log.info("Operation completed", context);

			expect(consoleSpy.info).toHaveBeenCalledWith("[INFO]", "Operation completed", context);
		});

		it("should log warning messages with context", () => {
			const context = { current: 95, threshold: 90 };

			log.warn("Threshold exceeded", context);

			expect(consoleSpy.warn).toHaveBeenCalledWith("[WARN]", "Threshold exceeded", context);
		});

		it("should handle non-Error objects in error method", () => {
			const errorString = "String error";

			log.error("An error occurred", errorString);

			expect(consoleSpy.error).toHaveBeenCalledWith("[ERROR]", "An error occurred", { rawError: errorString });
		});

		it("should include correlation ID when provided", () => {
			const context = { correlationId: "abc-123", data: "test" };

			log.info("Request processed", context);

			expect(consoleSpy.info).toHaveBeenCalledWith("[INFO]", "Request processed", {
				correlationId: "abc-123",
				data: "test",
			});
		});
	});

	describe("in production mode", () => {
		beforeEach(() => {
			process.env.NODE_ENV = "production";
		});

		it("should not log any messages in production", () => {
			const error = new Error("Production error");

			log.error("Error in production", error);
			log.info("Info in production", { data: "test" });
			log.warn("Warning in production", { level: "high" });

			expect(consoleSpy.error).not.toHaveBeenCalled();
			expect(consoleSpy.info).not.toHaveBeenCalled();
			expect(consoleSpy.warn).not.toHaveBeenCalled();
		});

		it("should not log even with complex contexts in production", () => {
			const complexContext = {
				correlationId: "xyz-789",
				metadata: { timestamp: Date.now() },
				user: { id: "123", name: "Test" },
			};

			log.error("Complex error", new Error("Test"), complexContext);
			log.info("Complex info", complexContext);
			log.warn("Complex warning", complexContext);

			expect(consoleSpy.error).not.toHaveBeenCalled();
			expect(consoleSpy.info).not.toHaveBeenCalled();
			expect(consoleSpy.warn).not.toHaveBeenCalled();
		});
	});

	describe("in test mode", () => {
		beforeEach(() => {
			process.env.NODE_ENV = "test";
		});

		it("should not log messages in test mode", () => {
			log.error("Test mode error", new Error("Test"));
			log.info("Test mode info");
			log.warn("Test mode warning");

			expect(consoleSpy.error).not.toHaveBeenCalled();
			expect(consoleSpy.info).not.toHaveBeenCalled();
			expect(consoleSpy.warn).not.toHaveBeenCalled();
		});
	});

	describe("edge cases", () => {
		beforeEach(() => {
			process.env.NODE_ENV = "development";
		});

		it("should handle undefined error gracefully", () => {
			log.error("Undefined error occurred", undefined, { action: "test" });

			expect(consoleSpy.error).toHaveBeenCalledWith("[ERROR]", "Undefined error occurred", { action: "test" });
		});

		it("should handle null context", () => {
			log.info("Message with null context", null as any);

			expect(consoleSpy.info).toHaveBeenCalledWith("[INFO]", "Message with null context", null);
		});

		it("should handle empty context", () => {
			log.warn("Message with empty context", {});

			expect(consoleSpy.warn).toHaveBeenCalledWith("[WARN]", "Message with empty context", {});
		});
	});
});