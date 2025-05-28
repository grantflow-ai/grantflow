import { beforeEach, describe, expect, it, vi } from "vitest";

import { addToWaitlist } from "@/actions/join-waitlist";
import { WAITING_LIST_RESPONSE_CODES } from "@/enums";
import { logError } from "@/utils/logging";

const { mockLists, mockMailgun, mockMessages } = vi.hoisted(() => {
	const mockLists = {
		create: vi.fn().mockResolvedValue({ name: "waiting-list" }),
		list: vi.fn().mockResolvedValue({ items: [] }),
		members: {
			createMember: vi.fn().mockResolvedValue({ member: { address: "test@example.com" } }),
		},
	};

	const mockMessages = {
		create: vi.fn().mockResolvedValue({ id: "mock-message-id", status: 200 }),
	};

	const mockMailgun = vi.fn(() => ({
		client: () => ({
			lists: mockLists,
			messages: mockMessages,
		}),
	}));

	return { mockLists, mockMailgun, mockMessages };
});

vi.mock("node:fs/promises", async () => {
	return {
		default: {
			readFile: vi.fn().mockResolvedValue(Buffer.from("fake-logo-data")),
		},
		readFile: vi.fn().mockResolvedValue(Buffer.from("fake-logo-data")),
	};
});

vi.mock("@/utils/logging", () => ({
	logError: vi.fn(),
}));

vi.mock("@/utils/env", () => ({
	getEnv: vi.fn().mockReturnValue({
		NEXT_PUBLIC_MAILGUN_API_KEY: "mock-api-key",
	}),
}));

vi.mock("@/components/waitlist-email-template", () => ({
	getWaitlistEmailTemplateHtml: vi.fn().mockReturnValue("<p>Mock HTML template</p>"),
	waitlistEmailTemplateText: vi.fn().mockReturnValue("Mock text template"),
}));

vi.mock("mailgun.js", () => ({
	default: mockMailgun,
}));

describe("join-waitlist actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should handle mailing list creation error", async () => {
		mockLists.list.mockRejectedValueOnce(new Error("Failed to fetch lists"));

		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(logError).toHaveBeenCalledTimes(1);
		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SERVER_ERROR);
	});

	it("should handle mailing list member creation error", async () => {
		mockLists.list.mockResolvedValueOnce({ items: [{ name: "waiting-list" }] });
		mockLists.members.createMember.mockRejectedValueOnce(new Error("Failed to create member"));

		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(logError).toHaveBeenCalledTimes(1);
		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SERVER_ERROR);
	});

	it("should handle message creation error", async () => {
		mockLists.list.mockResolvedValueOnce({ items: [{ name: "waiting-list" }] });
		mockLists.members.createMember.mockResolvedValueOnce({ member: { address: "test@example.com" } });
		mockMessages.create.mockRejectedValueOnce(new Error("Failed to send email"));

		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(logError).toHaveBeenCalledTimes(1);
		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SERVER_ERROR);
	});

	it("should handle message creation HTTP error", async () => {
		mockLists.list.mockResolvedValueOnce({ items: [{ name: "waiting-list" }] });
		mockLists.members.createMember.mockResolvedValueOnce({ member: { address: "test@example.com" } });
		mockMessages.create.mockResolvedValueOnce({
			details: "Something went wrong",
			id: "mock-message-id",
			message: "Bad Request",
			status: 400,
		});

		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(logError).toHaveBeenCalledTimes(1);
		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SERVER_ERROR);
	});

	it("should create a new mailing list if one doesn't exist", async () => {
		mockLists.list.mockResolvedValueOnce({ items: [] });
		mockLists.create.mockResolvedValueOnce({ name: "waiting-list" });
		mockLists.members.createMember.mockResolvedValueOnce({ member: { address: "test@example.com" } });
		mockMessages.create.mockResolvedValueOnce({ id: "mock-message-id", status: 200 });

		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SUCCESS);
	});

	it("should use an existing mailing list if one exists", async () => {
		mockLists.list.mockResolvedValueOnce({
			items: [{ name: "waiting-list" }],
		});
		mockLists.members.createMember.mockResolvedValueOnce({
			member: { address: "test@example.com" },
		});
		mockMessages.create.mockResolvedValueOnce({
			id: "mock-message-id",
			status: 200,
		});

		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(mockLists.create).not.toHaveBeenCalled();
		expect(result.code).toBe(WAITING_LIST_RESPONSE_CODES.SUCCESS);
	});

	it("should successfully process happy path where all APIs succeed", async () => {
		mockLists.list.mockResolvedValueOnce({ items: [{ name: "waiting-list" }] });
		mockLists.members.createMember.mockResolvedValueOnce({ member: { address: "success@example.com" } });
		mockMessages.create.mockResolvedValueOnce({ id: "mock-email-id", status: 200 });

		const validFormData = {
			email: "success@example.com",
			name: "Happy Path",
		};

		const result = await addToWaitlist(validFormData);

		expect(logError).not.toHaveBeenCalled();
		expect(result).toEqual({
			code: WAITING_LIST_RESPONSE_CODES.SUCCESS,
		});
	});
});
