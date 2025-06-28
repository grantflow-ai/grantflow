import ky from "ky";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";
import { Ref } from "@/utils/state";
import { getClient } from "./api";

vi.mock("ky");
vi.mock("@/utils/env");
vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));
vi.mock("@/utils/state");

describe("api", () => {
	const mockKyInstance = {
		delete: vi.fn(),
		extend: vi.fn(),
		get: vi.fn(),
		patch: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
	};

	const mockHeaders = new Map([
		["X-Correlation-ID", "test-correlation-id"],
		["X-Operation", "test-operation"],
	]);

	const mockRequest = {
		headers: {
			get: (key: string) => mockHeaders.get(key),
		},
		method: "GET",
		url: "https://api.example.com/test",
	};

	const mockResponse = {
		ok: true,
		status: 200,
		statusText: "OK",
	};

	const mockEnv = {
		NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://api.example.com",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getEnv).mockReturnValue(mockEnv as any);
		vi.mocked(ky.create).mockReturnValue(mockKyInstance as any);

		// Reset the Ref value to ensure fresh client creation
		const RefConstructor = vi.mocked(Ref);
		RefConstructor.prototype.value = undefined;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("getClient", () => {
		it("should create a ky instance with correct configuration", () => {
			const client = getClient();

			expect(ky.create).toHaveBeenCalledWith({
				hooks: expect.any(Object),
				prefixUrl: "https://api.example.com",
				timeout: 600_000, // 10 minutes
			});

			expect(client).toBe(mockKyInstance);
		});

		it("should reuse the same client instance on subsequent calls", () => {
			const client1 = getClient();
			const client2 = getClient();

			expect(ky.create).toHaveBeenCalledTimes(1);
			expect(client1).toBe(client2);
		});

		it("should configure afterResponse hook correctly", () => {
			getClient();

			const createCall = vi.mocked(ky.create).mock.calls[0]?.[0];
			expect(createCall).toBeDefined();
			const afterResponseHook = createCall!.hooks?.afterResponse?.[0];

			if (afterResponseHook) {
				const result = afterResponseHook(mockRequest as any, {} as any, mockResponse as any);

				expect(log.info).toHaveBeenCalledWith("API GET https://api.example.com/test - 200", {
					correlation_id: "test-correlation-id",
					method: "GET",
					operation: "test-operation",
					status: 200,
					url: "https://api.example.com/test",
				});

				expect(result).toBe(mockResponse);
			}
		});

		it("should configure beforeError hook correctly", () => {
			getClient();

			const createCall = vi.mocked(ky.create).mock.calls[0]?.[0];
			expect(createCall).toBeDefined();
			const beforeErrorHook = createCall!.hooks?.beforeError?.[0];

			if (beforeErrorHook) {
				const mockError = {
					message: "Network error",
					request: mockRequest,
					response: { status: 500 },
				};

				const result = beforeErrorHook(mockError as any);

				expect(log.error).toHaveBeenCalledWith("API ERROR GET https://api.example.com/test", undefined, {
					correlation_id: "test-correlation-id",
					error: "Network error",
					method: "GET",
					operation: "test-operation",
					status: 500,
					url: "https://api.example.com/test",
				});

				expect(result).toBe(mockError);
			}
		});

		it("should configure beforeRequest hook correctly", () => {
			getClient();

			const createCall = vi.mocked(ky.create).mock.calls[0]?.[0];
			expect(createCall).toBeDefined();
			const beforeRequestHook = createCall!.hooks?.beforeRequest?.[0];

			if (beforeRequestHook) {
				beforeRequestHook(mockRequest as any, {} as any);

				expect(log.info).toHaveBeenCalledWith("API GET https://api.example.com/test", {
					correlation_id: "test-correlation-id",
					method: "GET",
					operation: "test-operation",
					url: "https://api.example.com/test",
				});
			}
		});

		it("should handle missing headers gracefully", () => {
			getClient();

			const createCall = vi.mocked(ky.create).mock.calls[0]?.[0];
			expect(createCall).toBeDefined();
			const afterResponseHook = createCall!.hooks?.afterResponse?.[0];

			const requestWithNoHeaders = {
				...mockRequest,
				headers: {
					get: () => null,
				},
			};

			if (afterResponseHook) {
				afterResponseHook(requestWithNoHeaders as any, {} as any, mockResponse as any);

				expect(log.info).toHaveBeenCalledWith("API GET https://api.example.com/test - 200", {
					correlation_id: null,
					method: "GET",
					operation: null,
					status: 200,
					url: "https://api.example.com/test",
				});
			}
		});

		it("should handle different HTTP methods", () => {
			getClient();

			const createCall = vi.mocked(ky.create).mock.calls[0]?.[0];
			expect(createCall).toBeDefined();
			const beforeRequestHook = createCall!.hooks?.beforeRequest?.[0];

			const methods = ["POST", "PUT", "DELETE", "PATCH"];

			methods.forEach((method) => {
				const request = { ...mockRequest, method };

				if (beforeRequestHook) {
					beforeRequestHook(request as any, {} as any);

					expect(log.info).toHaveBeenCalledWith(
						`API ${method} https://api.example.com/test`,
						expect.objectContaining({
							method,
						}),
					);
				}
			});
		});

		it("should handle different response statuses", () => {
			getClient();

			const createCall = vi.mocked(ky.create).mock.calls[0]?.[0];
			expect(createCall).toBeDefined();
			const afterResponseHook = createCall!.hooks?.afterResponse?.[0];

			const statuses = [201, 204, 301, 400, 401, 403, 404, 500];

			statuses.forEach((status) => {
				const response = { ...mockResponse, status };

				if (afterResponseHook) {
					afterResponseHook(mockRequest as any, {} as any, response as any);

					expect(log.info).toHaveBeenCalledWith(
						`API GET https://api.example.com/test - ${status}`,
						expect.objectContaining({
							status,
						}),
					);
				}
			});
		});

		it("should use correct timeout value", () => {
			getClient();

			expect(ky.create).toHaveBeenCalledWith(
				expect.objectContaining({
					timeout: 600_000, // 10 minutes (60 * 1000 * 10)
				}),
			);
		});

		it("should use environment variable for prefixUrl", () => {
			const customEnv = {
				NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://custom-api.example.com",
			};
			vi.mocked(getEnv).mockReturnValue(customEnv as any);

			// Reset the client to force recreation
			const RefConstructor = vi.mocked(Ref);
			RefConstructor.prototype.value = undefined;

			getClient();

			expect(ky.create).toHaveBeenCalledWith(
				expect.objectContaining({
					prefixUrl: "https://custom-api.example.com",
				}),
			);
		});
	});
});