import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockResend, mockSend } = vi.hoisted(() => {
	const mockSend = vi.fn();
	const mockResend = vi.fn(() => ({
		emails: {
			send: mockSend,
		},
	}));

	return { mockResend, mockSend };
});

vi.mock("resend", () => ({
	Resend: mockResend,
}));

import { inviteCollaborator } from "./project-invitation";

describe("inviteCollaborator", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should send invitation email successfully", async () => {
		mockSend.mockResolvedValue({ error: null });

		const result = await inviteCollaborator({
			email: "test@example.com",
			inviterName: "John Doe",
			projectId: "project-123",
			projectName: "Test Project",
			role: "member",
		});

		expect(result.success).toBe(true);
		expect(result.invitationId).toBeDefined();
		expect(mockSend).toHaveBeenCalledWith({
			from: "noreply@grantflow.ai",
			html: expect.stringContaining("John Doe"),
			subject: "Invitation to collaborate on Test Project",
			to: ["test@example.com"],
		});
	});

	it("should handle email send failure", async () => {
		mockSend.mockResolvedValue({ error: { message: "Send failed" } });

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
