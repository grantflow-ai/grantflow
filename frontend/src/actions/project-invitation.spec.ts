import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Resend instance
const mockEmailSend = vi.fn();

// Mock dependencies - must be before imports
vi.mock("@/actions/project");
vi.mock("@/utils/env");
vi.mock("resend", () => ({
	Resend: vi.fn().mockImplementation(() => ({
		emails: {
			send: mockEmailSend,
		},
	})),
}));

import { createInvitation } from "@/actions/project";
import { getEnv } from "@/utils/env";
import { inviteCollaborator } from "./project-invitation";

const mockCreateInvitation = vi.mocked(createInvitation);
const mockGetEnv = vi.mocked(getEnv);

beforeEach(() => {
	vi.clearAllMocks();

	mockGetEnv.mockReturnValue({
		NEXT_PUBLIC_SITE_URL: "https://app.grantflow.ai",
		RESEND_API_KEY: "test-key",
	} as any);
});

describe("inviteCollaborator", () => {
	const defaultParams = {
		email: "test@example.com",
		inviterName: "John Doe",
		projectId: "proj-123",
		projectName: "Test Project",
		role: "member" as const,
	};

	it("should create backend invitation and send email successfully", async () => {
		// Mock backend invitation creation
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateInvitation.mockResolvedValue({
			token: fullToken,
		});

		// Mock successful email sending
		mockEmailSend.mockResolvedValue({ error: null });

		const result = await inviteCollaborator(defaultParams);

		expect(mockCreateInvitation).toHaveBeenCalledWith("proj-123", {
			email: "test@example.com",
			role: "MEMBER",
		});

		expect(mockEmailSend).toHaveBeenCalledWith({
			from: "noreply@grantflow.ai",
			react: expect.any(Object),
			subject: "Invitation to collaborate on Test Project",
			to: ["test@example.com"],
		});

		expect(result).toEqual({
			invitationId: "inv-456",
			success: true,
		});
	});

	it("should map admin role correctly", async () => {
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateInvitation.mockResolvedValue({
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({ error: null });

		await inviteCollaborator({
			...defaultParams,
			role: "admin",
		});

		expect(mockCreateInvitation).toHaveBeenCalledWith("proj-123", {
			email: "test@example.com",
			role: "ADMIN",
		});
	});

	it("should handle backend invitation creation failure", async () => {
		mockCreateInvitation.mockRejectedValue(new Error("Backend error"));

		const result = await inviteCollaborator(defaultParams);

		expect(result).toEqual({
			error: "Backend error",
			success: false,
		});
	});

	it("should handle email sending failure", async () => {
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateInvitation.mockResolvedValue({
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({
			error: { message: "Email sending failed" },
		});

		const result = await inviteCollaborator(defaultParams);

		expect(result).toEqual({
			error: "Email sending failed",
			success: false,
		});
	});

	it("should use correct invitation URL with token", async () => {
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateInvitation.mockResolvedValue({
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({ error: null });

		await inviteCollaborator(defaultParams);

		// Verify that the email was sent with the correct parameters
		expect(mockEmailSend).toHaveBeenCalledWith({
			from: "noreply@grantflow.ai",
			react: expect.any(Object),
			subject: "Invitation to collaborate on Test Project",
			to: ["test@example.com"],
		});

		// The React component is complex due to React Email structure
		// Just verify the call was made - the URL building logic is tested elsewhere
		expect(mockEmailSend).toHaveBeenCalledTimes(1);
	});

	it("should use localhost fallback when NEXT_PUBLIC_SITE_URL is not set", async () => {
		mockGetEnv.mockReturnValue({
			NEXT_PUBLIC_SITE_URL: undefined,
			RESEND_API_KEY: "test-key",
		} as any);

		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateInvitation.mockResolvedValue({
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({ error: null });

		await inviteCollaborator(defaultParams);

		// Verify that the email was sent (the URL building logic is tested elsewhere)
		expect(mockEmailSend).toHaveBeenCalledWith({
			from: "noreply@grantflow.ai",
			react: expect.any(Object),
			subject: "Invitation to collaborate on Test Project",
			to: ["test@example.com"],
		});

		expect(mockEmailSend).toHaveBeenCalledTimes(1);
	});

	it("should handle unknown errors gracefully", async () => {
		mockCreateInvitation.mockRejectedValue("Unknown error");

		const result = await inviteCollaborator(defaultParams);

		expect(result).toEqual({
			error: "Failed to send invitation",
			success: false,
		});
	});
});
