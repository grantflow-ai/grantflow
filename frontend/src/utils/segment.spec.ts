import { AnalyticsBrowser } from "@segment/analytics-next";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
		page: vi.fn(),
		track: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(AnalyticsBrowser.load).mockReturnValue(mockAnalytics as any);
		
		// Reset global state
		delete (globalThis as any).window;
	});

	describe("getAnalytics", () => {
		it("should return null when window is undefined (SSR)", () => {
			// No window object (SSR environment)
			const result = getAnalytics();
			expect(result).toBeNull();
			expect(AnalyticsBrowser.load).not.toHaveBeenCalled();
		});

		it("should load analytics when window is available", () => {
			// Mock window object (browser environment)
			(globalThis as any).window = {};

			const result = getAnalytics();

			expect(AnalyticsBrowser.load).toHaveBeenCalledWith({
				writeKey: "test-segment-key",
			});
			expect(result).toBe(mockAnalytics);
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
	});

	describe("analyticsIdentify", () => {
		const mockUserData = {
			email: "test@example.com",
			firstName: "John",
			lastName: "Doe",
		};

		it("should identify user when analytics is available", async () => {
			(globalThis as any).window = {};
			
			// First call getAnalytics to initialize
			getAnalytics();
			
			await analyticsIdentify("user-123", mockUserData);

			expect(mockAnalytics.identify).toHaveBeenCalledWith("user-123", mockUserData);
		});

		it("should handle SSR environment gracefully", async () => {
			// No window object - getAnalytics will return null
			await analyticsIdentify("user-123", mockUserData);

			// Should not throw and analytics.identify should not be called
			expect(mockAnalytics.identify).not.toHaveBeenCalled();
		});

		it("should handle null analytics gracefully", async () => {
			// This should not throw when analytics is null
			await expect(analyticsIdentify("user-123", mockUserData)).resolves.toBeUndefined();
		});
	});

	describe("Browser Environment Detection", () => {
		it("should work correctly in browser environment", () => {
			(globalThis as any).window = {};
			
			const analytics = getAnalytics();
			expect(analytics).toBeDefined();
			expect(AnalyticsBrowser.load).toHaveBeenCalled();
		});

		it("should not load in SSR environment", () => {
			// No window
			const analytics = getAnalytics();
			expect(analytics).toBeNull();
			expect(AnalyticsBrowser.load).not.toHaveBeenCalled();
		});
	});
});