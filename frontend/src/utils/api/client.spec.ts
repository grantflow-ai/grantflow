import ky from "ky";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger/client";

vi.mock("ky");
vi.mock("@/utils/env");
vi.mock("@/utils/logger/client", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe("api/client", () => {
	const mockKyInstance = {
		delete: vi.fn(),
		extend: vi.fn(),
		get: vi.fn(),
		patch: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
	};

	const mockHeaders = new Map([
		["X-Operation", "test-operation"],
		["X-Trace-ID", "test-trace-id"],
	]);

	const mockRequest = {
		headers: {
			entries: () => mockHeaders.entries(),
			get: (key: string) => mockHeaders.get(key),
		},
		method: "GET",
		url: "https://api.example.com/test",
	};

	const mockResponse = {
		clone: () => ({
			json: () => Promise.resolve({}),
		}),
		headers: {
			entries: () => [].entries(),
			get: () => "application/json",
		},
		ok: true,
		status: 200,
		statusText: "OK",
	};

	const mockEnv = {
		NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://api.example.com",
	};

	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		vi.mocked(getEnv).mockReturnValue(mockEnv as any);
		vi.mocked(ky.create).mockReturnValue(mockKyInstance as any);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("getClient", () => {
		it("creates a ky instance with correct configuration", async () => {
			const { getClient } = await import("./client");
			const client = getClient();

			expect(ky.create).toHaveBeenCalledWith({
				hooks: expect.any(Object),
				prefixUrl: "https://api.example.com",
				timeout: 600_000,
			});

			expect(client).toBe(mockKyInstance);
		});

		it("reuses the same client instance on subsequent calls", async () => {
			const { getClient } = await import("./client");
			const client1 = getClient();
			const client2 = getClient();

			expect(ky.create).toHaveBeenCalledTimes(1);
			expect(client1).toBe(client2);
		});

		it("configures afterResponse hook correctly", async () => {
			const { getClient } = await import("./client");
			getClient();

			const createCall = vi.mocked(ky.create).mock.calls[0]?.[0];
			expect(createCall).toBeDefined();
			const afterResponseHook = createCall!.hooks?.afterResponse?.[0];

			if (afterResponseHook) {
				vi.clearAllMocks();
				await afterResponseHook(mockRequest as any, {} as any, mockResponse as any, { retryCount: 0 });

				expect(log.info).toHaveBeenCalledWith("API GET https://api.example.com/test - 200", {
					method: "GET",
					operation: "test-operation",
					response_body: {},
					response_headers: {},
					retry_count: 0,
					status: 200,
					trace_id: "test-trace-id",
					url: "https://api.example.com/test",
				});
			}
		});

		it("configures beforeError hook correctly", async () => {
			const { getClient } = await import("./client");
			getClient();

			const createCall = vi.mocked(ky.create).mock.calls[0]?.[0];
			expect(createCall).toBeDefined();
			const beforeErrorHook = createCall!.hooks?.beforeError?.[0];

			if (beforeErrorHook) {
				const mockError = {
					message: "Network error",
					request: mockRequest,
					response: {
						clone: () => ({
							json: () => Promise.resolve({}),
						}),
						headers: {
							entries: () => [].entries(),
							get: () => "application/json",
						},
						status: 500,
						statusText: "Server error",
					},
				};

				vi.clearAllMocks();
				await beforeErrorHook(mockError as any, { retryCount: 0 });

				expect(log.error).toHaveBeenCalledWith("API ERROR GET https://api.example.com/test", mockError, {
					backend_url: "https://api.example.com",
					error_message: "Network error",
					method: "GET",
					operation: "test-operation",
					request_headers: expect.any(Object),
					response_body: {},
					response_headers: {},
					response_text: undefined,
					retry_count: 0,
					status: 500,
					status_text: "Server error",
					trace_id: "test-trace-id",
					url: "https://api.example.com/test",
				});
			}
		});

		it("configures beforeRequest hook correctly", async () => {
			const { getClient } = await import("./client");
			getClient();

			const createCall = vi.mocked(ky.create).mock.calls[0]?.[0];
			expect(createCall).toBeDefined();
			const beforeRequestHook = createCall!.hooks?.beforeRequest?.[0];

			if (beforeRequestHook) {
				vi.clearAllMocks();
				await beforeRequestHook(mockRequest as any, {} as any, { retryCount: 0 });

				expect(log.info).toHaveBeenCalledWith("API REQUEST GET https://api.example.com/test", {
					base_url: "https://api.example.com",
					full_url: "https://api.example.com/test",
					method: "GET",
					operation: "test-operation",
					pathname: "/test",
					request_body: undefined,
					request_headers: expect.any(Object),
					retry_count: 0,
					trace_id: "test-trace-id",
					url: "https://api.example.com/test",
				});
			}
		});

		it("handles missing headers gracefully", async () => {
			const { getClient } = await import("./client");
			getClient();

			const createCall = vi.mocked(ky.create).mock.calls[0]?.[0];
			expect(createCall).toBeDefined();
			const afterResponseHook = createCall!.hooks?.afterResponse?.[0];

			const requestWithNoHeaders = {
				...mockRequest,
				headers: {
					entries: () => [].entries(),
					get: () => null,
				},
			};

			if (afterResponseHook) {
				vi.clearAllMocks();
				await afterResponseHook(requestWithNoHeaders as any, {} as any, mockResponse as any, { retryCount: 0 });

				expect(log.info).toHaveBeenCalledWith("API GET https://api.example.com/test - 200", {
					method: "GET",
					operation: null,
					response_body: {},
					response_headers: {},
					retry_count: 0,
					status: 200,
					trace_id: null,
					url: "https://api.example.com/test",
				});
			}
		});

		it("handles different HTTP methods", async () => {
			const { getClient } = await import("./client");
			getClient();

			const createCall = vi.mocked(ky.create).mock.calls[0]?.[0];
			expect(createCall).toBeDefined();
			const beforeRequestHook = createCall!.hooks?.beforeRequest?.[0];

			const methods = ["POST", "PUT", "DELETE", "PATCH"];

			vi.clearAllMocks();

			for (const method of methods) {
				const request = { ...mockRequest, method };

				if (beforeRequestHook) {
					await beforeRequestHook(request as any, {} as any, { retryCount: 0 });

					expect(log.info).toHaveBeenCalledWith(
						`API REQUEST ${method} https://api.example.com/test`,
						expect.objectContaining({
							method,
							retry_count: 0,
						}),
					);
				}
			}
		});

		it("handles different response statuses", async () => {
			const { getClient } = await import("./client");
			getClient();

			const createCall = vi.mocked(ky.create).mock.calls[0]?.[0];
			expect(createCall).toBeDefined();
			const afterResponseHook = createCall!.hooks?.afterResponse?.[0];

			const statuses = [201, 204, 301, 400, 401, 403, 404, 500];

			vi.clearAllMocks();

			for (const status of statuses) {
				const response = { ...mockResponse, status };

				if (afterResponseHook) {
					await afterResponseHook(mockRequest as any, {} as any, response as any, { retryCount: 0 });

					expect(log.info).toHaveBeenCalledWith(
						`API GET https://api.example.com/test - ${status}`,
						expect.objectContaining({
							retry_count: 0,
							status,
						}),
					);
				}
			}
		});

		it("uses correct timeout value", async () => {
			const { getClient } = await import("./client");
			getClient();

			expect(ky.create).toHaveBeenCalledWith(
				expect.objectContaining({
					timeout: 600_000,
				}),
			);
		});

		it("uses environment variable for prefixUrl", async () => {
			const customEnv = {
				NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://custom-api.example.com",
			};
			vi.mocked(getEnv).mockReturnValue(customEnv as any);

			const { getClient } = await import("./client");
			getClient();

			expect(ky.create).toHaveBeenCalledWith(
				expect.objectContaining({
					prefixUrl: "https://custom-api.example.com",
				}),
			);
		});
	});
});
