import { describe, expect, it, vi } from "vitest";

import { inviteCollaborator } from "./project-invitation";

// Mock Resend
vi.mock("resend", () => ({
	Resend: vi.fn(() => ({
		emails: {
			send: vi.fn(),
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
	it("should send invitation email successfully", async () => {
		const { Resend } = await import("resend");
		const mockSend = vi.fn().mockResolvedValue({ error: null });
		(Resend as any).mockImplementation(() => ({
			emails: { send: mockSend },
		}));

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
		const { Resend } = await import("resend");
		const mockSend = vi.fn().mockResolvedValue({ error: { message: "Send failed" } });
		(Resend as any).mockImplementation(() => ({
			emails: { send: mockSend },
		}));

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
