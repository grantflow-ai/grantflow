import { beforeEach, describe, expect, it, vi } from "vitest";

import { inviteCollaborator } from "./project-invitation";

const mockEmailsSend = vi.fn();

// Mock Resend
vi.mock("resend", () => ({
	Resend: vi.fn(() => ({
		emails: {
			send: mockEmailsSend,
		},
	})),
}));

// Mock env
vi.mock("@/utils/env", () => ({
	getEnv: () => ({
		RESEND_API_KEY: "test-key",
	}),
}));

describe("inviteCollaborator", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should send invitation email successfully", async () => {
		mockEmailsSend.mockResolvedValue({ error: null });

		const result = await inviteCollaborator({
			email: "test@example.com",
			inviterName: "John Doe",
			projectId: "project-123",
			projectName: "Test Project",
			role: "member",
		});

		expect(result.success).toBe(true);
		expect(result.invitationId).toBeDefined();
		expect(mockEmailsSend).toHaveBeenCalledWith({
			from: "noreply@grantflow.ai",
			html: expect.stringContaining("John Doe"),
			subject: "Invitation to collaborate on Test Project",
			to: ["test@example.com"],
		});
	});

	it("should handle email send failure", async () => {
		mockEmailsSend.mockResolvedValue({ error: { message: "Send failed" } });

		const result = await inviteCollaborator({
			email: "test@example.com",
			inviterName: "John Doe",
			projectId: "project-123",
			projectName: "Test Project",
			role: "admin",
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe("Send failed");
	});
});
