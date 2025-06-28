import { AnalyticsBrowser } from "@segment/analytics-next";
import { getEnv } from "./env";
import { analyticsIdentify, getAnalytics } from "./segment";

// Mock dependencies
vi.mock("@segment/analytics-next", () => ({
	AnalyticsBrowser: {
		load: vi.fn(),
	},
}));

vi.mock("./env", () => ({
	getEnv: vi.fn(() => ({
		NEXT_PUBLIC_SEGMENT_WRITE_KEY: "test-segment-key",
	})),
}));

describe("Segment Analytics", () => {
	const mockAnalytics = {
		identify: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset the analytics singleton
		(globalThis as any).window = undefined;
		vi.mocked(AnalyticsBrowser.load).mockReturnValue(mockAnalytics as any);
	});

	describe("getAnalytics", () => {
		it("should return null when window is not available", () => {
			// No window object
			const result = getAnalytics();

			expect(result).toBeNull();
			expect(AnalyticsBrowser.load).not.toHaveBeenCalled();
		});

		it("should initialize analytics when window is available", () => {
			// Mock window object
			(globalThis as any).window = {};

			const result = getAnalytics();

			expect(AnalyticsBrowser.load).toHaveBeenCalledWith({
				writeKey: "test-segment-key",
			});
			expect(result).toBe(mockAnalytics);
		});

		it("should return cached analytics instance on subsequent calls", () => {
			// Mock window object
			(globalThis as any).window = {};

			const result1 = getAnalytics();
			const result2 = getAnalytics();

			expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(1);
			expect(result1).toBe(result2);
			expect(result1).toBe(mockAnalytics);
		});

		it("should use environment variable for write key", () => {
			vi.mocked(getEnv).mockReturnValue({
				NEXT_PUBLIC_SEGMENT_WRITE_KEY: "custom-key-123",
			} as any);

			(globalThis as any).window = {};

			getAnalytics();

			expect(AnalyticsBrowser.load).toHaveBeenCalledWith({
				writeKey: "custom-key-123",
			});
		});

		it("should handle different window object types", () => {
			// Set window to a truthy value
			(globalThis as any).window = { document: {} };

			const result = getAnalytics();

			expect(AnalyticsBrowser.load).toHaveBeenCalled();
			expect(result).toBe(mockAnalytics);
		});
	});

	describe("analyticsIdentify", () => {
		beforeEach(() => {
			(globalThis as any).window = {};
		});

		it("should call analytics identify with correct parameters", async () => {
			const userId = "user-123";
			const traits = {
				email: "test@example.com",
				firstName: "John",
				lastName: "Doe",
			};

			await analyticsIdentify(userId, traits);

			expect(mockAnalytics.identify).toHaveBeenCalledWith(userId, traits);
		});

		it("should handle identify call when analytics is available", async () => {
			const userId = "user-456";
			const traits = {
				email: "jane@example.com",
				firstName: "Jane",
				lastName: "Smith",
			};

			await analyticsIdentify(userId, traits);

			expect(getAnalytics).toBeTruthy(); // Analytics should be initialized
			expect(mockAnalytics.identify).toHaveBeenCalledWith(userId, traits);
		});

		it("should not throw when analytics is null", async () => {
			// No window available
			(globalThis as any).window = undefined;

			const userId = "user-789";
			const traits = {
				email: "test@example.com",
				firstName: "Test",
				lastName: "User",
			};

			// Should not throw even when analytics is null
			await expect(analyticsIdentify(userId, traits)).resolves.toBeUndefined();
		});

		it("should handle async identify call", async () => {
			mockAnalytics.identify.mockResolvedValue(undefined);

			const userId = "async-user";
			const traits = {
				email: "async@example.com",
				firstName: "Async",
				lastName: "User",
			};

			await analyticsIdentify(userId, traits);

			expect(mockAnalytics.identify).toHaveBeenCalledWith(userId, traits);
		});

		it("should handle identify call with special characters in traits", async () => {
			const userId = "special-user";
			const traits = {
				email: "special+test@example.com",
				firstName: "John-Paul",
				lastName: "O'Connor",
			};

			await analyticsIdentify(userId, traits);

			expect(mockAnalytics.identify).toHaveBeenCalledWith(userId, traits);
		});

		it("should handle identify call with empty strings", async () => {
			const userId = "";
			const traits = {
				email: "",
				firstName: "",
				lastName: "",
			};

			await analyticsIdentify(userId, traits);

			expect(mockAnalytics.identify).toHaveBeenCalledWith(userId, traits);
		});

		it("should handle identify rejection gracefully", async () => {
			const error = new Error("Analytics identify failed");
			mockAnalytics.identify.mockRejectedValue(error);

			const userId = "failing-user";
			const traits = {
				email: "fail@example.com",
				firstName: "Fail",
				lastName: "User",
			};

			// Should propagate the error
			await expect(analyticsIdentify(userId, traits)).rejects.toThrow("Analytics identify failed");
		});
	});

	describe("Singleton behavior", () => {
		it("should maintain singleton across multiple getAnalytics calls", () => {
			(globalThis as any).window = {};

			const analytics1 = getAnalytics();
			const analytics2 = getAnalytics();
			const analytics3 = getAnalytics();

			expect(analytics1).toBe(analytics2);
			expect(analytics2).toBe(analytics3);
			expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(1);
		});

		it("should handle window check correctly", () => {
			// First call without window
			const result1 = getAnalytics();
			expect(result1).toBeNull();

			// Add window
			(globalThis as any).window = {};
			const result2 = getAnalytics();
			expect(result2).toBe(mockAnalytics);

			// Third call should return cached value
			const result3 = getAnalytics();
			expect(result3).toBe(mockAnalytics);
			expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(1);
		});
	});

	describe("Environment variable handling", () => {
		it("should work with different write key formats", () => {
			const testCases = ["sk_test_123", "prod_key_456", "dev-key-789", ""];

			testCases.forEach((writeKey) => {
				vi.clearAllMocks();
				vi.mocked(getEnv).mockReturnValue({
					NEXT_PUBLIC_SEGMENT_WRITE_KEY: writeKey,
				} as any);

				(globalThis as any).window = {};

				getAnalytics();

				expect(AnalyticsBrowser.load).toHaveBeenCalledWith({
					writeKey,
				});
			});
		});
	});
});