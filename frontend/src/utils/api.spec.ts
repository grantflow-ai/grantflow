import ky from "ky";
import { getEnv } from "@/utils/env";
import { logTrace } from "@/utils/logging";
import { Ref } from "@/utils/state";
import { getClient } from "./api";

// Mock dependencies
vi.mock("ky", () => ({
	default: {
		create: vi.fn(),
	},
}));

vi.mock("@/utils/env", () => ({
	getEnv: vi.fn(() => ({
		NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://api.test.com",
	})),
}));

vi.mock("@/utils/logging", () => ({
	logTrace: vi.fn(),
}));

vi.mock("@/utils/state", () => ({
	Ref: vi.fn(() => ({ value: null })),
}));

describe("API Utils", () => {
	const mockKyCreate = vi.fn();
	const mockLogTrace = vi.fn();
	const mockRef = { value: null };

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup mocks
		vi.mocked(ky.create).mockReturnValue(mockKyCreate as any);
		vi.mocked(logTrace).mockImplementation(mockLogTrace);
		vi.mocked(Ref).mockReturnValue(mockRef as any);

		// Reset ref value
		mockRef.value = null;
	});

	describe("getClient", () => {
		it("should create ky client with correct configuration", () => {
			const mockClient = { mock: "client" };
			vi.mocked(ky.create).mockReturnValue(mockClient as any);

			const result = getClient();

			expect(mockKyCreate).toHaveBeenCalledWith({
				hooks: expect.objectContaining({
					afterResponse: expect.arrayContaining([expect.any(Function)]),
					beforeError: expect.arrayContaining([expect.any(Function)]),
					beforeRequest: expect.arrayContaining([expect.any(Function)]),
				}),
				prefixUrl: "https://api.test.com",
				timeout: 600_000, // 10 minutes in ms
			});

			expect(result).toBe(mockClient);
		});

		it("should cache client instance on subsequent calls", () => {
			const mockClient = { mock: "client" };
			vi.mocked(ky.create).mockReturnValue(mockClient as any);
			mockRef.value = mockClient;

			const result1 = getClient();
			const result2 = getClient();

			expect(result1).toBe(result2);
			expect(vi.mocked(ky.create)).toHaveBeenCalledTimes(1); // Only called once due to caching
		});

		it("should configure beforeRequest hook to log requests", () => {
			const mockClient = { mock: "client" };
			vi.mocked(ky.create).mockReturnValue(mockClient as any);

			getClient();

			const config = vi.mocked(ky.create).mock.calls[0][0];
			const beforeRequestHook = config.hooks.beforeRequest[0];

			// Mock request object
			const mockRequest = {
				headers: {
					get: vi.fn((header: string) => {
						const headers: Record<string, string> = {
							"X-Correlation-ID": "test-correlation-id",
							"X-Operation": "test-operation",
						};
						return headers[header];
					}),
				},
				method: "GET",
				url: "https://api.test.com/users",
			};

			beforeRequestHook(mockRequest);

			expect(mockLogTrace).toHaveBeenCalledWith("info", "API GET https://api.test.com/users", {
				correlation_id: "test-correlation-id",
				method: "GET",
				operation: "test-operation",
				url: "https://api.test.com/users",
			});
		});

		it("should configure afterResponse hook to log successful responses", () => {
			const mockClient = { mock: "client" };
			vi.mocked(ky.create).mockReturnValue(mockClient as any);

			getClient();

			const config = vi.mocked(ky.create).mock.calls[0][0];
			const afterResponseHook = config.hooks.afterResponse[0];

			// Mock request and response objects
			const mockRequest = {
				headers: {
					get: vi.fn((header: string) => {
						const headers: Record<string, string> = {
							"X-Correlation-ID": "response-correlation-id",
							"X-Operation": "create-user",
						};
						return headers[header];
					}),
				},
				method: "POST",
				url: "https://api.test.com/users",
			};

			const mockResponse = {
				status: 201,
			};

			const result = afterResponseHook(mockRequest, {}, mockResponse);

			expect(mockLogTrace).toHaveBeenCalledWith("info", "API POST https://api.test.com/users - 201", {
				correlation_id: "response-correlation-id",
				method: "POST",
				operation: "create-user",
				status: 201,
				url: "https://api.test.com/users",
			});

			expect(result).toBe(mockResponse);
		});

		it("should configure beforeError hook to log errors", () => {
			const mockClient = { mock: "client" };
			vi.mocked(ky.create).mockReturnValue(mockClient as any);

			getClient();

			const config = vi.mocked(ky.create).mock.calls[0][0];
			const beforeErrorHook = config.hooks.beforeError[0];

			// Mock error object
			const mockError = {
				message: "Request failed",
				request: {
					headers: {
						get: vi.fn((header: string) => {
							const headers: Record<string, string> = {
								"X-Correlation-ID": "error-correlation-id",
								"X-Operation": "delete-user",
							};
							return headers[header];
						}),
					},
					method: "DELETE",
					url: "https://api.test.com/users/123",
				},
				response: {
					status: 404,
				},
			};

			const result = beforeErrorHook(mockError);

			expect(mockLogTrace).toHaveBeenCalledWith("error", "API ERROR DELETE https://api.test.com/users/123", {
				correlation_id: "error-correlation-id",
				error: "Request failed",
				method: "DELETE",
				operation: "delete-user",
				status: 404,
				url: "https://api.test.com/users/123",
			});

			expect(result).toBe(mockError);
		});

		it("should handle missing headers gracefully", () => {
			const mockClient = { mock: "client" };
			vi.mocked(ky.create).mockReturnValue(mockClient as any);

			getClient();

			const config = vi.mocked(ky.create).mock.calls[0][0];
			const beforeRequestHook = config.hooks.beforeRequest[0];

			// Mock request without correlation headers
			const mockRequest = {
				headers: {
					get: vi.fn(() => null), // No headers
				},
				method: "GET",
				url: "https://api.test.com/health",
			};

			beforeRequestHook(mockRequest);

			expect(mockLogTrace).toHaveBeenCalledWith("info", "API GET https://api.test.com/health", {
				correlation_id: null,
				method: "GET",
				operation: null,
				url: "https://api.test.com/health",
			});
		});

		it("should use environment variable for prefix URL", () => {
			vi.mocked(getEnv).mockReturnValue({
				NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://custom.api.com",
			} as any);

			const mockClient = { mock: "client" };
			vi.mocked(ky.create).mockReturnValue(mockClient as any);

			getClient();

			const config = vi.mocked(ky.create).mock.calls[0][0];
			expect(config.prefixUrl).toBe("https://custom.api.com");
		});

		it("should set correct timeout value", () => {
			const mockClient = { mock: "client" };
			vi.mocked(ky.create).mockReturnValue(mockClient as any);

			getClient();

			const config = vi.mocked(ky.create).mock.calls[0][0];
			expect(config.timeout).toBe(600_000); // 10 minutes * 60 seconds * 1000 ms
		});

		it("should handle multiple hook calls without errors", () => {
			const mockClient = { mock: "client" };
			vi.mocked(ky.create).mockReturnValue(mockClient as any);

			getClient();

			const config = vi.mocked(ky.create).mock.calls[0][0];

			// Test all hooks with mock data
			const mockRequest = {
				headers: { get: vi.fn(() => "test-id") },
				method: "PUT",
				url: "https://api.test.com/users/456",
			};

			const mockResponse = { status: 200 };
			const mockError = {
				message: "Server error",
				request: mockRequest,
				response: { status: 500 },
			};

			// Should not throw when calling hooks
			expect(() => {
				config.hooks.beforeRequest[0](mockRequest);
				config.hooks.afterResponse[0](mockRequest, {}, mockResponse);
				config.hooks.beforeError[0](mockError);
			}).not.toThrow();

			expect(mockLogTrace).toHaveBeenCalledTimes(3);
		});
	});
});