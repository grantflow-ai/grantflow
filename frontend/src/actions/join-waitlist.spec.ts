import { beforeEach, describe, expect, it, vi } from "vitest";

import { WAITING_LIST_RESPONSE_CODES } from "@/enums";
import { logError } from "@/utils/logging";

import { addToWaitlist } from "./join-waitlist";

const { mockResend } = vi.hoisted(() => {
	const mockEmailsSend = vi.fn().mockResolvedValue({
		data: { id: "email-id-123" },
		error: null,
	});

	const mockResend = vi.fn().mockImplementation(() => ({
		emails: {
			send: mockEmailsSend,
		},
	}));

	return { mockEmailsSend, mockResend };
});

vi.mock("@/utils/logging", () => ({
	logError: vi.fn(),
}));

vi.mock("@/utils/env", () => ({
	getEnv: vi.fn().mockReturnValue({
		NEXT_PUBLIC_SITE_URL: "https://example.com",
		RESEND_API_KEY: "re_mock_api_key",
	}),
}));

vi.mock("@/emails/waitlist-email", () => ({
	WaitlistEmail: vi.fn().mockReturnValue("MockedWaitlistEmail"),
}));

vi.mock("resend", () => ({
	Resend: mockResend,
}));

describe("join-waitlist actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should successfully send confirmation email with valid data", async () => {
		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(logError).not.toHaveBeenCalled();
		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SUCCESS);
		expect(result.error).toBeUndefined();
		expect(result.message).toBeUndefined();
	});

	it("should handle Resend API errors", async () => {
		const mockResendInstance = new mockResend();
		vi.mocked(mockResendInstance.emails.send).mockResolvedValueOnce({
			data: null,
			error: { message: "Invalid email address" },
		});

		const result = await addToWaitlist({
			email: "invalid@example.com",
			name: "Test User",
		});

		expect(logError).toHaveBeenCalledWith({
			error: "Failed to send confirmation email: Failed to send confirmation email: Invalid email address",
			identifier: "addToWaitlist",
		});
		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SERVER_ERROR);
	});

	it("should handle Resend SDK exceptions", async () => {
		const mockResendInstance = new mockResend();
		vi.mocked(mockResendInstance.emails.send).mockRejectedValueOnce(new Error("Network error"));

		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(logError).toHaveBeenCalledWith({
			error: "Failed to send confirmation email: Network error",
			identifier: "addToWaitlist",
		});
		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SERVER_ERROR);
	});

	it("should handle empty name gracefully", async () => {
		const result = await addToWaitlist({
			email: "test@example.com",
			name: "",
		});

		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SUCCESS);
	});

	it("should pass correct data to email API", async () => {
		const mockResendInstance = new mockResend();
		const mockSend = vi.mocked(mockResendInstance.emails.send);

		await addToWaitlist({
			email: "john@example.com",
			name: "John Researcher",
		});

		expect(mockSend).toHaveBeenCalledWith({
			from: "noreply@grantflow.ai",
			react: expect.any(String),
			subject: "Confirmation: You've Joined the GrantFlow Waitlist",
			to: "john@example.com", // The mocked React component
		});
	});
});
