import { beforeEach, describe, expect, it, vi } from "vitest";

// Create mock implementations
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

// Create a spy for the Mailgun constructor
const mockClient = vi.fn();
const mockMailgun = vi.fn(() => ({ client: mockClient }));

// Create mock API responses
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

// Link all mocks together
mockClient.mockReturnValue({
	lists: mockLists,
	messages: mockMessages,
});

// Mock mailgun.js dependency
vi.mock("mailgun.js", () => ({
	default: mockMailgun,
}));

// Import the module under test
import { addToWaitlist, RESPONSE_CODES } from "@/actions/join-waitlist";
import { logError } from "@/utils/logging";

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

		expect(result.code).toBe(RESPONSE_CODES.SUCCESS);
		expect(result.errors).toBeUndefined();
	});

	it("should reject missing email", async () => {
		const invalidData = {
			name: "John Doe",
		} as any;

		const result = await addToWaitlist(invalidData);

		expect(result.code).toBe(RESPONSE_CODES.VALIDATION_ERROR);
		expect(result.errors?.email).toBeDefined();
	});

	it("should reject missing name", async () => {
		const invalidData = {
			email: "john.doe@example.com",
		} as any;

		const result = await addToWaitlist(invalidData);

		expect(result.code).toBe(RESPONSE_CODES.VALIDATION_ERROR);
		expect(result.errors?.name).toBeDefined();
	});

	it("should reject invalid email format", async () => {
		const invalidData = {
			email: "not-an-email",
			name: "John Doe",
		};

		const result = await addToWaitlist(invalidData);

		expect(result.code).toBe(RESPONSE_CODES.VALIDATION_ERROR);
		expect(result.errors?.email).toBeDefined();
	});

	it("should reject empty strings", async () => {
		const invalidData = {
			email: "",
			name: "",
		};

		const result = await addToWaitlist(invalidData);

		expect(result.code).toBe(RESPONSE_CODES.VALIDATION_ERROR);
		expect(result.errors).toBeDefined();
	});
});

describe("addToWaitlist API interactions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should handle mailing list creation error", async () => {
		mockLists.list.mockRejectedValueOnce(new Error("Failed to fetch lists"));

		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(mockLists.list).toHaveBeenCalledTimes(1);
		expect(logError).toHaveBeenCalledTimes(1);
		expect(result.code).toBe(RESPONSE_CODES.SERVER_ERROR);
	});

	it("should handle mailing list member creation error", async () => {
		mockLists.list.mockResolvedValueOnce({ items: [{ name: "waiting-list" }] });
		mockLists.members.createMember.mockRejectedValueOnce(new Error("Failed to create member"));

		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(mockLists.list).toHaveBeenCalledTimes(1);
		expect(mockLists.members.createMember).toHaveBeenCalledTimes(1);
		expect(logError).toHaveBeenCalledTimes(1);
		expect(result.code).toBe(RESPONSE_CODES.SERVER_ERROR);
	});

	it("should handle message creation error", async () => {
		mockLists.list.mockResolvedValueOnce({ items: [{ name: "waiting-list" }] });
		mockLists.members.createMember.mockResolvedValueOnce({ member: { address: "test@example.com" } });
		mockMessages.create.mockRejectedValueOnce(new Error("Failed to send email"));

		const result = await addToWaitlist({
			email: "test@example.com",
			name: "Test User",
		});

		expect(mockLists.list).toHaveBeenCalledTimes(1);
		expect(mockLists.members.createMember).toHaveBeenCalledTimes(1);
		expect(mockMessages.create).toHaveBeenCalledTimes(1);
		expect(logError).toHaveBeenCalledTimes(1);
		expect(result.code).toBe(RESPONSE_CODES.SERVER_ERROR);
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

		expect(mockLists.list).toHaveBeenCalledTimes(1);
		expect(mockLists.members.createMember).toHaveBeenCalledTimes(1);
		expect(mockMessages.create).toHaveBeenCalledTimes(1);
		expect(logError).toHaveBeenCalledTimes(1);
		expect(result.code).toBe(RESPONSE_CODES.SERVER_ERROR);
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

		expect(mockLists.list).toHaveBeenCalledTimes(1);
		expect(mockLists.create).toHaveBeenCalledTimes(1);
		expect(mockLists.members.createMember).toHaveBeenCalledTimes(1);
		expect(mockMessages.create).toHaveBeenCalledTimes(1);
		expect(result.code).toBe(RESPONSE_CODES.SUCCESS);
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

		expect(mockLists.list).toHaveBeenCalledTimes(1);
		expect(mockLists.create).not.toHaveBeenCalled();
		expect(mockLists.members.createMember).toHaveBeenCalledTimes(1);
		expect(mockMessages.create).toHaveBeenCalledTimes(1);
		expect(result.code).toBe(RESPONSE_CODES.SUCCESS);
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

		expect(mockLists.list).toHaveBeenCalledTimes(1);
		expect(mockLists.members.createMember).toHaveBeenCalledTimes(1);
		expect(mockLists.members.createMember).toHaveBeenCalledWith("waiting-list", {
			address: "success@example.com",
			name: "Happy Path",
			subscribed: true,
			upsert: "yes",
			vars: JSON.stringify({ name: "Happy Path" }),
		});

		expect(logError).not.toHaveBeenCalled();

		expect(mockMessages.create).toHaveBeenCalledTimes(1);
		expect(mockMessages.create).toHaveBeenCalledWith("grantflow.ai", {
			from: "noreply@grantflow.ai",
			html: "<p>Mock HTML template</p>",
			subject: "Confirmation: You've Joined the GrantFlow Waitlist",
			text: "Mock text template",
			to: "success@example.com",
		});

		expect(result).toEqual({
			code: RESPONSE_CODES.SUCCESS,
		});
	});
});
