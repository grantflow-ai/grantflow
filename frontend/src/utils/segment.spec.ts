import { describe, expect, it, vi } from "vitest";

import * as segmentModule from "./segment";

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
	describe("analyticsIdentify", () => {
		const mockUserData = {
			email: "test@example.com",
			firstName: "John",
			lastName: "Doe",
		};

		it("should handle analytics calls gracefully", async () => {
			await expect(segmentModule.analyticsIdentify("user-123", mockUserData)).resolves.toBeUndefined();
		});

		it("should handle null user data", async () => {
			await expect(
				segmentModule.analyticsIdentify("user-123", {
					email: "",
					firstName: "",
					lastName: "",
				}),
			).resolves.toBeUndefined();
		});
	});

	describe("getAnalytics", () => {
		it("should return analytics instance when available", () => {
			const result = segmentModule.getAnalytics();

			expect(result).toBeDefined();
		});

		it("should be callable multiple times", () => {
			const first = segmentModule.getAnalytics();
			const second = segmentModule.getAnalytics();
			expect(first).toBe(second);
		});
	});
});
