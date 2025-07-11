import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { log } from "./logger";

describe("Logger", () => {
	const consoleSpy: {
		error: MockInstance;
		info: MockInstance;
		warn: MockInstance;
	} = {
		error: vi.spyOn(console, "error").mockImplementation(() => {}),
		info: vi.spyOn(console, "info").mockImplementation(() => {}),
		warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe("in development mode", () => {
		beforeEach(() => {
			vi.stubEnv("NODE_ENV", "development");
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

			expect(consoleSpy.error).toHaveBeenCalledWith("[ERROR]", "An error occurred", { error: errorString });
		});

		it("should include correlation ID when provided", () => {
			const context = { data: "test", traceId: "abc-123" };

			log.info("Request processed", context);

			expect(consoleSpy.info).toHaveBeenCalledWith("[INFO]", "Request processed", {
				data: "test",
				traceId: "abc-123",
			});
		});
	});

	describe("in production mode", () => {
		beforeEach(() => {
			vi.stubEnv("NODE_ENV", "production");
		});

		it("should log messages in production", () => {
			const error = new Error("Production error");

			log.error("Error in production", error);
			log.info("Info in production", { data: "test" });
			log.warn("Warning in production", { level: "high" });

			expect(consoleSpy.error).toHaveBeenCalledWith("[ERROR]", "Error in production", {
				error: {
					message: "Production error",
					name: "Error",
					stack: expect.any(String),
				},
			});
			expect(consoleSpy.info).toHaveBeenCalledWith("[INFO]", "Info in production", { data: "test" });
			expect(consoleSpy.warn).toHaveBeenCalledWith("[WARN]", "Warning in production", { level: "high" });
		});

		it("should log complex contexts in production", () => {
			const complexContext = {
				metadata: { timestamp: Date.now() },
				traceId: "xyz-789",
				user: { id: "123", name: "Test" },
			};

			log.error("Complex error", new Error("Test"), complexContext);
			log.info("Complex info", complexContext);
			log.warn("Complex warning", complexContext);

			expect(consoleSpy.error).toHaveBeenCalledWith("[ERROR]", "Complex error", {
				error: {
					message: "Test",
					name: "Error",
					stack: expect.any(String),
				},
				metadata: { timestamp: expect.any(Number) },
				traceId: "xyz-789",
				user: { id: "123", name: "Test" },
			});
			expect(consoleSpy.info).toHaveBeenCalledWith("[INFO]", "Complex info", complexContext);
			expect(consoleSpy.warn).toHaveBeenCalledWith("[WARN]", "Complex warning", complexContext);
		});
	});

	describe("in test mode", () => {
		beforeEach(() => {
			vi.stubEnv("NODE_ENV", "test");
		});

		it("should log messages in test mode", () => {
			log.error("Test mode error", new Error("Test"));
			log.info("Test mode info");
			log.warn("Test mode warning");

			expect(consoleSpy.error).toHaveBeenCalledWith("[ERROR]", "Test mode error", {
				error: {
					message: "Test",
					name: "Error",
					stack: expect.any(String),
				},
			});
			expect(consoleSpy.info).toHaveBeenCalledWith("[INFO]", "Test mode info", {});
			expect(consoleSpy.warn).toHaveBeenCalledWith("[WARN]", "Test mode warning", {});
		});
	});

	describe("edge cases", () => {
		beforeEach(() => {
			vi.stubEnv("NODE_ENV", "development");
		});

		it("should handle undefined error gracefully", () => {
			log.error("Undefined error occurred", undefined, { action: "test" });

			expect(consoleSpy.error).toHaveBeenCalledWith("[ERROR]", "Undefined error occurred", { action: "test" });
		});

		it("should handle null context", () => {
			log.info("Message with null context", null as any);

			expect(consoleSpy.info).toHaveBeenCalledWith("[INFO]", "Message with null context", {});
		});

		it("should handle empty context", () => {
			log.warn("Message with empty context", {});

			expect(consoleSpy.warn).toHaveBeenCalledWith("[WARN]", "Message with empty context", {});
		});
	});
});
