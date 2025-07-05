import { describe, expect, it } from "vitest";

import { WAITING_LIST_RESPONSE_CODES } from "@/enums";

import { addToWaitlist } from "./join-waitlist";

describe("join-waitlist actions", () => {
	it("should return success for valid data", async () => {
		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SUCCESS);
		expect(result.error).toBeUndefined();
		expect(result.message).toBeUndefined();
	});

	it("should handle empty name gracefully", async () => {
		const result = await addToWaitlist({
			email: "test@example.com",
			name: "",
		});

		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SUCCESS);
	});

	it("should handle various email formats", async () => {
		const result = await addToWaitlist({
			email: "john+test@example.com",
			name: "John Researcher",
		});

		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SUCCESS);
	});
});
