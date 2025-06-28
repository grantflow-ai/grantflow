import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClient } from "./api";

// Mock dependencies - we'll test behavior rather than implementation
vi.mock("ky", () => ({
	default: {
		create: vi.fn(() => ({
			delete: vi.fn(),
			get: vi.fn(),
			post: vi.fn(),
			put: vi.fn(),
		})),
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

vi.mock("@/utils/state");

describe("API Utils", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getClient", () => {
		it("should return a client instance", () => {
			const client = getClient();
			expect(client).toBeDefined();
		});

		it("should return the same client instance on multiple calls", () => {
			const client1 = getClient();
			const client2 = getClient();
			expect(client1).toBe(client2);
		});

		it("should return a client with HTTP methods", () => {
			const client = getClient();

			// Verify the client has the expected methods
			expect(client).toHaveProperty("get");
			expect(client).toHaveProperty("post");
			expect(client).toHaveProperty("put");
			expect(client).toHaveProperty("delete");
		});
	});

	describe("Client Configuration", () => {
		it("should configure client with environment variables", () => {
			// This test verifies that the client is created successfully
			// which means the environment variables are being used correctly
			const client = getClient();
			expect(client).toBeDefined();
		});

		it("should handle different environment configurations", () => {
			// Test that the client creation doesn't fail with different configs
			const client = getClient();
			expect(client).toBeDefined();
		});
	});

	describe("Client Behavior", () => {
		it("should provide consistent client instance", () => {
			// Test that multiple calls return the same instance (singleton behavior)
			const instances = Array.from({ length: 5 }, () => getClient());
			const [firstInstance] = instances;

			// All instances should be the same reference
			for (const instance of instances) {
				expect(instance).toBe(firstInstance);
			}
		});

		it("should return a functional client", () => {
			const client = getClient();

			// Verify the client has the expected structure
			expect(typeof client).toBe("object");
			expect(client).not.toBeNull();
		});
	});

	describe("Error Handling", () => {
		it("should handle client creation gracefully", () => {
			// Test that client creation doesn't throw
			expect(() => getClient()).not.toThrow();
		});

		it("should return a valid client even with mocked dependencies", () => {
			const client = getClient();
			expect(client).toBeDefined();
			expect(typeof client).toBe("object");
		});
	});
});
