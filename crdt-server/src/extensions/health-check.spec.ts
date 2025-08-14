import type { IncomingMessage, ServerResponse } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { logger } from "@/utils/logger";
import { HealthCheckExtension } from "./health-check";

vi.mock("@/db");
vi.mock("@/utils/logger");

describe("HealthCheckExtension", () => {
	let extension: HealthCheckExtension;
	let mockRequest: Partial<IncomingMessage>;
	let mockResponse: Partial<ServerResponse>;

	beforeEach(() => {
		extension = new HealthCheckExtension();
		mockRequest = {
			headers: { host: "localhost:8080" },
			url: "/health",
		};
		mockResponse = {
			end: vi.fn(),
			writeHead: vi.fn(),
		};
		vi.clearAllMocks();
	});

	describe("health endpoint", () => {
		it("should return OK for /health endpoint", async () => {
			mockRequest.url = "/health";

			await expect(
				extension.onRequest({
					request: mockRequest as IncomingMessage,
					response: mockResponse as ServerResponse,
				} as any),
			).rejects.toThrow();

			expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
				"Cache-Control": "no-cache, no-store, must-revalidate",
				"Content-Type": "text/plain",
			});
			expect(mockResponse.end).toHaveBeenCalledWith("OK");
		});

		it("should log health check success", async () => {
			mockRequest.url = "/health";

			try {
				await extension.onRequest({
					request: mockRequest as IncomingMessage,
					response: mockResponse as ServerResponse,
				} as any);
			} catch {
				// Expected error throw
			}

			expect(logger.debug).toHaveBeenCalledWith("health_check_success");
		});
	});

	describe("readiness endpoint", () => {
		it("should return OK when database is healthy", async () => {
			mockRequest.url = "/ready";
			vi.mocked(db.execute).mockResolvedValue([] as any);

			await expect(
				extension.onRequest({
					request: mockRequest as IncomingMessage,
					response: mockResponse as ServerResponse,
				} as any),
			).rejects.toThrow();

			expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
				"Cache-Control": "no-cache, no-store, must-revalidate",
				"Content-Type": "text/plain",
			});
			expect(mockResponse.end).toHaveBeenCalledWith("OK");
		});

		it("should return NOT READY when database is unhealthy", async () => {
			mockRequest.url = "/ready";
			vi.mocked(db.execute).mockRejectedValue(new Error("Database connection failed"));

			await expect(
				extension.onRequest({
					request: mockRequest as IncomingMessage,
					response: mockResponse as ServerResponse,
				} as any),
			).rejects.toThrow();

			expect(mockResponse.writeHead).toHaveBeenCalledWith(503, {
				"Cache-Control": "no-cache, no-store, must-revalidate",
				"Content-Type": "text/plain",
			});
			expect(mockResponse.end).toHaveBeenCalledWith("NOT READY");
		});

		it("should log database health check failure", async () => {
			mockRequest.url = "/ready";
			const error = new Error("Database connection failed");
			vi.mocked(db.execute).mockRejectedValue(error);

			try {
				await extension.onRequest({
					request: mockRequest as IncomingMessage,
					response: mockResponse as ServerResponse,
				} as any);
			} catch {
				// Expected error throw
			}

			expect(logger.error).toHaveBeenCalledWith(
				{ error: "Database connection failed" },
				"database_health_check_failed",
			);
		});

		it("should log readiness check completion", async () => {
			mockRequest.url = "/ready";
			vi.mocked(db.execute).mockResolvedValue([] as any);

			try {
				await extension.onRequest({
					request: mockRequest as IncomingMessage,
					response: mockResponse as ServerResponse,
				} as any);
			} catch {
				// Expected error throw
			}

			expect(logger.debug).toHaveBeenCalledWith({ ready: true }, "readiness_check_completed");
		});
	});

	describe("non-health endpoints", () => {
		it("should not handle non-health endpoints", async () => {
			mockRequest.url = "/websocket";

			await extension.onRequest({
				request: mockRequest as IncomingMessage,
				response: mockResponse as ServerResponse,
			} as any);

			expect(mockResponse.writeHead).not.toHaveBeenCalled();
			expect(mockResponse.end).not.toHaveBeenCalled();
		});

		it("should handle requests with no URL", async () => {
			mockRequest.url = undefined;

			await extension.onRequest({
				request: mockRequest as IncomingMessage,
				response: mockResponse as ServerResponse,
			} as any);

			expect(mockResponse.writeHead).not.toHaveBeenCalled();
			expect(mockResponse.end).not.toHaveBeenCalled();
		});
	});

	describe("URL parsing", () => {
		it("should handle different host headers correctly", async () => {
			mockRequest.url = "/health";
			mockRequest.headers = { host: "example.com:3000" };

			await expect(
				extension.onRequest({
					request: mockRequest as IncomingMessage,
					response: mockResponse as ServerResponse,
				} as any),
			).rejects.toThrow();

			expect(mockResponse.end).toHaveBeenCalledWith("OK");
		});

		it("should handle requests without host header", async () => {
			mockRequest.url = "/health";
			mockRequest.headers = {};

			await expect(
				extension.onRequest({
					request: mockRequest as IncomingMessage,
					response: mockResponse as ServerResponse,
				} as any),
			).rejects.toThrow();

			expect(mockResponse.end).toHaveBeenCalledWith("OK");
		});
	});
});
