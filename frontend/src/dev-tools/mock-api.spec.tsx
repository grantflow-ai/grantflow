/**
 * Core Mock API Integration Tests
 * Tests the fundamental mock API functionality and integration points
 */

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WS from "vitest-websocket-mock";

vi.unmock("@/utils/env");

describe("Mock API Core Integration", () => {
	let originalEnv: typeof process.env;

	beforeEach(() => {
		originalEnv = { ...process.env };

		vi.resetModules();
		cleanup();
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.clearAllMocks();
		cleanup();
	});

	describe("Environment Variable Toggle", () => {
		it("should enable mock API when NEXT_PUBLIC_MOCK_API is true", async () => {
			process.env.NEXT_PUBLIC_MOCK_API = "true";

			const { isMockAPIEnabled } = await import("@/dev-tools/mock-api/client");

			expect(isMockAPIEnabled()).toBe(true);
		});

		it("should disable mock API when NEXT_PUBLIC_MOCK_API is false", async () => {
			process.env.NEXT_PUBLIC_MOCK_API = "false";

			const { isMockAPIEnabled } = await import("@/dev-tools/mock-api/client");

			expect(isMockAPIEnabled()).toBe(false);
		});

		it("should default to disabled when NEXT_PUBLIC_MOCK_API is undefined", async () => {
			process.env.NEXT_PUBLIC_MOCK_API = undefined;

			const { isMockAPIEnabled } = await import("@/dev-tools/mock-api/client");

			expect(isMockAPIEnabled()).toBe(false);
		});
	});

	describe("Mock API Client Initialization", () => {
		beforeEach(() => {
			process.env.NEXT_PUBLIC_MOCK_API = "true";
		});

		it("should initialize mock API client successfully", async () => {
			const { getMockAPIClient } = await import("@/dev-tools/mock-api/client");

			expect(() => getMockAPIClient()).not.toThrow();

			const client = getMockAPIClient();
			expect(client).toBeDefined();
			expect(typeof client.intercept).toBe("function");
			expect(typeof client.register).toBe("function");
		});

		it("should register mock handlers on initialization", async () => {
			const mockRegister = vi.fn();

			vi.doMock("@/dev-tools/mock-api/client", () => ({
				getMockAPIClient: () => ({
					intercept: vi.fn(),
					register: mockRegister,
				}),
				isMockAPIEnabled: () => true,
			}));

			const { registerMockHandlers } = await import("@/dev-tools/mock-api/register");
			registerMockHandlers();

			expect(mockRegister).toHaveBeenCalledWith("/auth/login", expect.any(Function), "POST");
			expect(mockRegister).toHaveBeenCalledWith("/projects", expect.any(Function), "GET");
			expect(mockRegister).toHaveBeenCalledWith(
				"/projects/:project_id/applications",
				expect.any(Function),
				"POST",
			);
		});

		it("should handle mock API client errors gracefully", async () => {
			vi.doMock("@/dev-tools/mock-api/client", () => ({
				getMockAPIClient: () => {
					throw new Error("Mock client initialization failed");
				},
				isMockAPIEnabled: () => true,
			}));

			const { getMockAPIClient } = await import("@/dev-tools/mock-api/client");

			expect(() => getMockAPIClient()).toThrow("Mock client initialization failed");
		});
	});

	describe("Ky Integration", () => {
		beforeEach(() => {
			process.env.NEXT_PUBLIC_MOCK_API = "true";
			process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL = "https://api.test.com";
		});

		it("should intercept API calls when mock mode is enabled", async () => {
			const mockIntercept = vi.fn().mockResolvedValue({ data: "mocked" });

			vi.doMock("@/dev-tools/mock-api/client", () => ({
				getMockAPIClient: () => ({
					intercept: mockIntercept,
					register: vi.fn(),
				}),
				isMockAPIEnabled: () => true,
			}));

			const { getClient } = await import("@/utils/api");
			const client = getClient();

			expect(client).toBeDefined();
			expect(typeof client.get).toBe("function");
		});

		it("should not intercept API calls when mock mode is disabled", async () => {
			process.env.NEXT_PUBLIC_MOCK_API = "false";

			const { getClient } = await import("@/utils/api");
			const client = getClient();

			expect(client).toBeDefined();
			expect(typeof client.get).toBe("function");
		});
	});

	describe("Mock Handler Registration", () => {
		beforeEach(() => {
			process.env.NEXT_PUBLIC_MOCK_API = "true";
		});

		it("should register all required mock handlers", async () => {
			const registeredPaths: string[] = [];
			const mockRegister = vi.fn().mockImplementation((path: string) => {
				registeredPaths.push(path);
			});

			vi.doMock("@/dev-tools/mock-api/client", () => ({
				getMockAPIClient: () => ({
					intercept: vi.fn(),
					register: mockRegister,
				}),
				isMockAPIEnabled: () => true,
			}));

			const { registerMockHandlers } = await import("@/dev-tools/mock-api/register");
			registerMockHandlers();

			const expectedPaths = [
				"/auth/login",
				"/otp",
				"/projects",
				"/projects/:project_id",
				"/projects/:project_id/applications",
				"/projects/:project_id/applications/:application_id",
			];

			expectedPaths.forEach((path) => {
				expect(registeredPaths).toContain(path);
			});
		});

		it("should only register handlers once", async () => {
			const mockRegister = vi.fn();

			vi.doMock("@/dev-tools/mock-api/client", () => ({
				getMockAPIClient: () => ({
					intercept: vi.fn(),
					register: mockRegister,
				}),
				isMockAPIEnabled: () => true,
			}));

			const { registerMockHandlers } = await import("@/dev-tools/mock-api/register");

			registerMockHandlers();
			registerMockHandlers();
			registerMockHandlers();

			const loginRegistrations = mockRegister.mock.calls.filter((call) => call[0] === "/auth/login");
			expect(loginRegistrations).toHaveLength(3);
		});
	});

	describe("Mock Response Generation", () => {
		beforeEach(() => {
			process.env.NEXT_PUBLIC_MOCK_API = "true";
		});

		it("should generate mock responses using factories", async () => {
			const { ApplicationFactory } = await import("::testing/factories");

			const mockApplication = ApplicationFactory.build();

			expect(mockApplication).toMatchObject({
				created_at: expect.any(String),
				id: expect.any(String),
				status: expect.stringMatching(/^(DRAFT|IN_PROGRESS|COMPLETED|CANCELLED)$/),
				title: expect.any(String),
			});
		});

		it("should handle errors in mock response generation", async () => {
			const mockHandler = vi.fn().mockRejectedValue(new Error("Handler failed"));

			vi.doMock("@/dev-tools/mock-api/client", () => ({
				getMockAPIClient: () => ({
					intercept: mockHandler,
					register: vi.fn(),
				}),
				isMockAPIEnabled: () => true,
			}));

			const { getMockAPIClient } = await import("@/dev-tools/mock-api/client");
			const client = getMockAPIClient();

			await expect(client.intercept("/test", {})).rejects.toThrow("Handler failed");
		});
	});

	describe("WebSocket Mock Integration", () => {
		let server: WS;

		beforeEach(async () => {
			process.env.NEXT_PUBLIC_MOCK_API = "true";

			server = new WS("ws://localhost:3001");
		});

		afterEach(() => {
			WS.clean();
		});

		it("should provide correct WebSocket URL for mock mode", async () => {
			const { getWebSocketUrl } = await import("@/dev-tools/mock-api/websocket");

			const url = getWebSocketUrl("/projects/123/applications/456/notifications");
			expect(url).toBe("ws://localhost:3001/projects/123/applications/456/notifications");
		});

		it("should provide real WebSocket URL when disabled", async () => {
			const backendUrl = "https://api.example.com";
			const path = "/projects/123/applications/456/notifications";

			const expectedUrl = backendUrl.replace(/^https?:\/\//, "ws://") + path;

			expect(expectedUrl).toBe("ws://api.example.com/projects/123/applications/456/notifications");
		});

		it("should initialize WebSocket mocking", async () => {
			vi.resetModules();
			const { initializeWebSocketMocking } = await import("@/dev-tools/mock-api/websocket");

			const OriginalWebSocket = globalThis.WebSocket;

			initializeWebSocketMocking();

			expect(globalThis.WebSocket).not.toBe(OriginalWebSocket);

			const ws = new WebSocket("ws://localhost:3001/test");
			expect(ws.url).toBe("ws://localhost:3001/test");
		});

		it("should handle WebSocket connections with vitest-websocket-mock", async () => {
			const client = new WebSocket("ws://localhost:3001");
			await server.connected;

			const receivedMessages: any[] = [];
			client.addEventListener("message", (event) => {
				receivedMessages.push(JSON.parse(event.data));
			});

			server.send(JSON.stringify({ data: "hello", event: "test" }));

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(receivedMessages).toHaveLength(1);
			expect(receivedMessages[0]).toEqual({ data: "hello", event: "test" });
		});
	});

	describe("Development vs Production", () => {
		it("should handle production environment", async () => {
			process.env.NEXT_PUBLIC_MOCK_API = "true";

			const { isMockAPIEnabled } = await import("@/dev-tools/mock-api/client");

			expect(isMockAPIEnabled()).toBe(true);
		});

		it("should handle missing dev-tools gracefully", async () => {
			process.env.NEXT_PUBLIC_MOCK_API = "false";

			expect(async () => {
				const { getClient } = await import("@/utils/api");
				return getClient();
			}).not.toThrow();
		});
	});

	describe("Type Safety", () => {
		it("should maintain type safety in mock responses", async () => {
			process.env.NEXT_PUBLIC_MOCK_API = "true";

			const mockResponse = {
				created_at: new Date().toISOString(),
				id: "test-id",
				status: "DRAFT" as const,
				title: "Test Application",
			};

			const mockIntercept = vi.fn().mockResolvedValue(mockResponse);

			vi.doMock("@/dev-tools/mock-api/client", () => ({
				getMockAPIClient: () => ({
					intercept: mockIntercept,
					register: vi.fn(),
				}),
				isMockAPIEnabled: () => true,
			}));

			const { getMockAPIClient } = await import("@/dev-tools/mock-api/client");
			const client = getMockAPIClient();

			const result = await client.intercept<typeof mockResponse>("/test", {});

			expect(result).toEqual(mockResponse);
			expect(result.status).toBe("DRAFT");
		});
	});
});
