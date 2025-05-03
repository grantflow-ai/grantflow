import { beforeEach, describe, expect, it, vi } from "vitest";
import { logError } from "@/utils/logging";
import { addToWaitlist } from "@/actions/waitlist//join-waitlist";
import { Resend } from "resend";

vi.mock("resend", () => {
	return {
		Resend: vi.fn().mockImplementation(() => ({
			audiences: {
				list: vi.fn().mockResolvedValue({ data: { data: [{ id: "mock-audience-id" }] }, error: null }),
			},
			contacts: {
				create: vi.fn().mockResolvedValue({ data: {}, error: null }),
			},
			emails: {
				send: vi.fn().mockResolvedValue({ data: {}, error: null }),
			},
		})),
	};
});

vi.mock("@/utils/logging", () => ({
	logError: vi.fn(),
}));

vi.mock("@/utils/env", () => ({
	getEnv: vi.fn().mockReturnValue({
		NEXT_PUBLIC_RESEND_API_KEY_FULL_ACCESS: "mock-api-key",
	}),
}));

vi.mock("@/components/waitlist-email-template", () => ({
	getWaitlistEmailTemplateHtml: vi.fn().mockReturnValue("<p>Mock HTML template</p>"),
	waitlistEmailTemplateText: vi.fn().mockReturnValue("Mock text template"),
}));

describe("addToWaitlist validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should validate and process valid form data", async () => {
		const validFormData = {
			email: "john.doe@example.com",
			name: "John Doe",
		};

		const result = await addToWaitlist(validFormData);

		expect(result.success).toBe(true);
		expect(result.code).toBe("SUCCESS");
		expect(result.errors).toBeUndefined();
	});

	it("should reject missing email", async () => {
		const invalidData = {
			name: "John Doe",
		} as any;

		const result = await addToWaitlist(invalidData);

		expect(result.success).toBe(false);
		expect(result.code).toBe("VALIDATION_ERROR");
		expect(result.errors?.email).toBeDefined();
	});

	it("should reject missing name", async () => {
		const invalidData = {
			email: "john.doe@example.com",
		} as any;

		const result = await addToWaitlist(invalidData);

		expect(result.success).toBe(false);
		expect(result.code).toBe("VALIDATION_ERROR");
		expect(result.errors?.name).toBeDefined();
	});

	it("should reject invalid email format", async () => {
		const invalidData = {
			email: "not-an-email",
			name: "John Doe",
		};

		const result = await addToWaitlist(invalidData);

		expect(result.success).toBe(false);
		expect(result.code).toBe("VALIDATION_ERROR");
		expect(result.errors?.email).toBeDefined();
	});

	it("should reject empty strings", async () => {
		const invalidData = {
			email: "",
			name: "",
		};

		const result = await addToWaitlist(invalidData);

		expect(result.success).toBe(false);
		expect(result.code).toBe("VALIDATION_ERROR");
		expect(result.errors).toBeDefined();
	});
});

describe("addToWaitlist API interactions", () => {
	let mockResendInstance: any;
	let addToWaitlist: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.resetModules();

		({ addToWaitlist } = await import("./join-waitlist"));

		mockResendInstance = vi.mocked(Resend).mock.results[0].value;
	});

	it("should handle missing audience ID but still send confirmation email", async () => {
		mockResendInstance.audiences.list.mockResolvedValueOnce({
			data: null,
			error: { message: "Failed to fetch audiences" },
		});

		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(mockResendInstance.audiences.list).toHaveBeenCalledTimes(1);

		expect(logError).toHaveBeenCalledWith({
			error: "Failed to fetch audiences",
			identifier: "waitlist-signup-error",
		});
		expect(logError).toHaveBeenCalledTimes(1);

		expect(mockResendInstance.contacts.create).not.toHaveBeenCalled();
		expect(mockResendInstance.emails.send).toHaveBeenCalled();

		expect(result.success).toBe(true);
		expect(result.code).toBe("SUCCESS");
		expect(result.errors).toBeUndefined();
	});

	it("should handle contacts API failure but still send confirmation email", async () => {
		mockResendInstance.audiences.list.mockResolvedValueOnce({
			data: { data: [{ id: "mock-audience-id" }] },
			error: null,
		});

		mockResendInstance.contacts.create.mockResolvedValueOnce({
			data: null,
			error: { message: "Failed to create contact" },
		});

		mockResendInstance.emails.send.mockResolvedValueOnce({ data: {}, error: null });

		const validFormData = {
			email: "test@example.com",
			name: "Test User",
		};

		const result = await addToWaitlist(validFormData);

		expect(mockResendInstance.audiences.list).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.contacts.create).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.contacts.create).toHaveBeenCalledWith({
			audienceId: "mock-audience-id",
			email: "test@example.com",
			firstName: "Test",
			lastName: "User",
			unsubscribed: false,
		});

		expect(logError).toHaveBeenCalledWith({
			error: "the contact could not be added to the audience: Failed to create contact",
			identifier: "waitlist-signup-error",
		});

		expect(mockResendInstance.emails.send).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
			from: "Na'aman from GrantFlow.ai <onboarding@resend.dev>",
			html: "<p>Mock HTML template</p>",
			subject: "Confirmation: You’ve Joined the GrantFlow Waitlist",
			text: "Mock text template",
			to: "test@example.com",
		});

		expect(result).toEqual({
			code: "SUCCESS",
			success: true,
		});
	});

	it("should handle rate limit error when sending confirmation email", async () => {
		mockResendInstance.audiences.list.mockResolvedValueOnce({
			data: { data: [{ id: "mock-audience-id" }] },
			error: null,
		});

		mockResendInstance.contacts.create.mockResolvedValueOnce({
			data: { id: "mock-contact-id" },
			error: null,
		});

		mockResendInstance.emails.send.mockResolvedValueOnce({
			data: null,
			error: {
				message: "Rate limit exceeded",
				name: "rate_limit_exceeded",
			},
		});

		const validFormData = {
			email: "rate-limited@example.com",
			name: "Rate Limited",
		};

		const result = await addToWaitlist(validFormData);

		expect(mockResendInstance.audiences.list).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.contacts.create).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.emails.send).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
			from: "Na'aman from GrantFlow.ai <onboarding@resend.dev>",
			html: "<p>Mock HTML template</p>",
			subject: "Confirmation: You’ve Joined the GrantFlow Waitlist",
			text: "Mock text template",
			to: "rate-limited@example.com",
		});

		expect(result).toEqual({
			code: "RATE_LIMITED",
			success: false,
		});
	});

	it("should handle generic error when sending confirmation email", async () => {
		mockResendInstance.audiences.list.mockResolvedValueOnce({
			data: { data: [{ id: "mock-audience-id" }] },
			error: null,
		});

		mockResendInstance.contacts.create.mockResolvedValueOnce({
			data: { id: "mock-contact-id" },
			error: null,
		});

		mockResendInstance.emails.send.mockResolvedValueOnce({
			data: null,
			error: {
				message: "Failed to send email",
				name: "send_error",
			},
		});

		const validFormData = {
			email: "email-error@example.com",
			name: "Email Error",
		};

		const result = await addToWaitlist(validFormData);

		expect(mockResendInstance.audiences.list).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.contacts.create).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.emails.send).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
			from: "Na'aman from GrantFlow.ai <onboarding@resend.dev>",
			html: "<p>Mock HTML template</p>",
			subject: "Confirmation: You’ve Joined the GrantFlow Waitlist",
			text: "Mock text template",
			to: "email-error@example.com",
		});

		expect(result).toEqual({
			code: "SERVER_ERROR",
			success: false,
		});
	});

	it("should handle audience API failure with undefined error", async () => {
		mockResendInstance.audiences.list.mockResolvedValueOnce({
			data: null,
			error: undefined,
		});

		mockResendInstance.emails.send.mockResolvedValueOnce({
			data: { id: "mock-email-id" },
			error: null,
		});

		const validFormData = {
			email: "audience-undefined-error@example.com",
			name: "Audience Test",
		};

		const result = await addToWaitlist(validFormData);

		expect(mockResendInstance.audiences.list).toHaveBeenCalledTimes(1);

		expect(logError).toHaveBeenCalledWith({
			error: "the audience could not be fetched",
			identifier: "waitlist-signup-error",
		});

		expect(mockResendInstance.contacts.create).not.toHaveBeenCalled();
		expect(mockResendInstance.emails.send).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
			from: "Na'aman from GrantFlow.ai <onboarding@resend.dev>",
			html: "<p>Mock HTML template</p>",
			subject: "Confirmation: You’ve Joined the GrantFlow Waitlist",
			text: "Mock text template",
			to: "audience-undefined-error@example.com",
		});

		expect(result).toEqual({
			code: "SUCCESS",
			success: true,
		});
	});

	it("should successfully process happy path where all APIs succeed", async () => {
		mockResendInstance.audiences.list.mockResolvedValueOnce({
			data: { data: [{ id: "mock-audience-id" }] },
			error: null,
		});

		mockResendInstance.contacts.create.mockResolvedValueOnce({
			data: { id: "mock-contact-id" },
			error: null,
		});

		mockResendInstance.emails.send.mockResolvedValueOnce({
			data: { id: "mock-email-id" },
			error: null,
		});

		const validFormData = {
			email: "success@example.com",
			name: "Happy Path",
		};

		const result = await addToWaitlist(validFormData);

		expect(mockResendInstance.audiences.list).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.contacts.create).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.contacts.create).toHaveBeenCalledWith({
			audienceId: "mock-audience-id",
			email: "success@example.com",
			firstName: "Happy",
			lastName: "Path",
			unsubscribed: false,
		});

		expect(logError).not.toHaveBeenCalled();

		expect(mockResendInstance.emails.send).toHaveBeenCalledTimes(1);
		expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
			from: "Na'aman from GrantFlow.ai <onboarding@resend.dev>",
			html: "<p>Mock HTML template</p>",
			subject: "Confirmation: You’ve Joined the GrantFlow Waitlist",
			text: "Mock text template",
			to: "success@example.com",
		});

		expect(result).toEqual({
			code: "SUCCESS",
			success: true,
		});
	});

	it("should handle unknown errors and log them appropriately", async () => {
		mockResendInstance.audiences.list.mockImplementationOnce(() => {
			throw new Error("Unexpected network failure");
		});

		const validFormData = {
			email: "error@example.com",
			name: "Error Test",
		};

		const result = await addToWaitlist(validFormData);

		expect(mockResendInstance.audiences.list).toHaveBeenCalledTimes(1);

		expect(logError).toHaveBeenCalledWith({
			error: "An unknown error occurred",
			identifier: "waitlist-signup-error",
		});

		expect(mockResendInstance.contacts.create).not.toHaveBeenCalled();
		expect(mockResendInstance.emails.send).not.toHaveBeenCalled();
		expect(result).toEqual({
			code: "SERVER_ERROR",
			success: false,
		});
	});

	afterEach(() => {
		vi.resetModules();
	});
});
