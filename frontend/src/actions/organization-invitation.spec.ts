import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEmailSend = vi.fn();

vi.mock("@/actions/organization");
vi.mock("@/utils/env");
vi.mock("resend", () => ({
	Resend: vi.fn().mockImplementation(() => ({
		emails: {
			send: mockEmailSend,
		},
	})),
}));

import { createOrganizationInvitation } from "@/actions/organization";
import { getEnv } from "@/utils/env";
import { inviteOrganizationMember } from "./organization-invitation";

const mockCreateOrganizationInvitation = vi.mocked(createOrganizationInvitation);
const mockGetEnv = vi.mocked(getEnv);

beforeEach(() => {
	vi.clearAllMocks();

	mockGetEnv.mockReturnValue({
		NEXT_PUBLIC_SITE_URL: "https://app.grantflow.ai",
		RESEND_API_KEY: "test-key",
	} as any);
});

describe("inviteOrganizationMember", () => {
	const defaultParams = {
		email: "test@example.com",
		inviterName: "John Doe",
		organizationId: "org-123",
		organizationName: "Test Organization",
		role: "member" as const,
	};

	it("should create backend invitation and send email successfully", async () => {
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateOrganizationInvitation.mockResolvedValue({
			expires_at: "2025-12-31T23:59:59Z",
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({ error: null });

		const result = await inviteOrganizationMember(defaultParams);

		expect(mockCreateOrganizationInvitation).toHaveBeenCalledWith("org-123", {
			email: "test@example.com",
			role: "COLLABORATOR",
		});

		expect(mockEmailSend).toHaveBeenCalledWith({
			from: "noreply@grantflow.ai",
			react: expect.any(Object),
			subject: "Invitation to join Test Organization",
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
		mockCreateOrganizationInvitation.mockResolvedValue({
			expires_at: "2025-12-31T23:59:59Z",
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({ error: null });

		await inviteOrganizationMember({
			...defaultParams,
			role: "admin",
		});

		expect(mockCreateOrganizationInvitation).toHaveBeenCalledWith("org-123", {
			email: "test@example.com",
			role: "ADMIN",
		});
	});

	it("should include hasAllProjectsAccess when provided", async () => {
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateOrganizationInvitation.mockResolvedValue({
			expires_at: "2025-12-31T23:59:59Z",
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({ error: null });

		await inviteOrganizationMember({
			...defaultParams,
			hasAllProjectsAccess: true,
		});

		expect(mockCreateOrganizationInvitation).toHaveBeenCalledWith("org-123", {
			email: "test@example.com",
			has_all_projects_access: true,
			role: "COLLABORATOR",
		});
	});

	it("should include projectIds when provided", async () => {
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateOrganizationInvitation.mockResolvedValue({
			expires_at: "2025-12-31T23:59:59Z",
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({ error: null });

		await inviteOrganizationMember({
			...defaultParams,
			hasAllProjectsAccess: false,
			projectIds: ["proj-1", "proj-2"],
		});

		expect(mockCreateOrganizationInvitation).toHaveBeenCalledWith("org-123", {
			email: "test@example.com",
			has_all_projects_access: false,
			project_ids: ["proj-1", "proj-2"],
			role: "COLLABORATOR",
		});
	});

	it("should not include hasAllProjectsAccess or projectIds when undefined", async () => {
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateOrganizationInvitation.mockResolvedValue({
			expires_at: "2025-12-31T23:59:59Z",
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({ error: null });

		await inviteOrganizationMember({
			...defaultParams,
			hasAllProjectsAccess: undefined,
			projectIds: undefined,
		});

		expect(mockCreateOrganizationInvitation).toHaveBeenCalledWith("org-123", {
			email: "test@example.com",
			role: "COLLABORATOR",
		});
	});

	it("should handle backend invitation creation failure", async () => {
		mockCreateOrganizationInvitation.mockRejectedValue(new Error("Backend error"));

		const result = await inviteOrganizationMember(defaultParams);

		expect(result).toEqual({
			error: "Backend error",
			success: false,
		});
	});

	it("should handle email sending failure", async () => {
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateOrganizationInvitation.mockResolvedValue({
			expires_at: "2025-12-31T23:59:59Z",
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({
			error: { message: "Email sending failed" },
		});

		const result = await inviteOrganizationMember(defaultParams);

		expect(result).toEqual({
			error: "Email sending failed",
			success: false,
		});
	});

	it("should use fallback subject when organizationName is not provided", async () => {
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateOrganizationInvitation.mockResolvedValue({
			expires_at: "2025-12-31T23:59:59Z",
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({ error: null });

		await inviteOrganizationMember({
			...defaultParams,
			organizationName: "",
		});

		expect(mockEmailSend).toHaveBeenCalledWith({
			from: "noreply@grantflow.ai",
			react: expect.any(Object),
			subject: "Invitation to join an organization",
			to: ["test@example.com"],
		});
	});

	it("should use localhost fallback when NEXT_PUBLIC_SITE_URL is not set", async () => {
		mockGetEnv.mockReturnValue({
			NEXT_PUBLIC_SITE_URL: undefined,
			RESEND_API_KEY: "test-key",
		} as any);

		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateOrganizationInvitation.mockResolvedValue({
			expires_at: "2025-12-31T23:59:59Z",
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({ error: null });

		await inviteOrganizationMember(defaultParams);

		expect(mockEmailSend).toHaveBeenCalledWith({
			from: "noreply@grantflow.ai",
			react: expect.any(Object),
			subject: "Invitation to join Test Organization",
			to: ["test@example.com"],
		});
	});

	it("should handle unknown errors gracefully", async () => {
		mockCreateOrganizationInvitation.mockRejectedValue("Unknown error");

		const result = await inviteOrganizationMember(defaultParams);

		expect(result).toEqual({
			error: "Failed to send invitation",
			success: false,
		});
	});

	it("should include empty projectIds array when provided but empty", async () => {
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-456" }));
		const fullToken = `header.${mockToken}.signature`;
		mockCreateOrganizationInvitation.mockResolvedValue({
			expires_at: "2025-12-31T23:59:59Z",
			token: fullToken,
		});

		mockEmailSend.mockResolvedValue({ error: null });

		await inviteOrganizationMember({
			...defaultParams,
			hasAllProjectsAccess: false,
			projectIds: [],
		});

		expect(mockCreateOrganizationInvitation).toHaveBeenCalledWith("org-123", {
			email: "test@example.com",
			has_all_projects_access: false,
			role: "COLLABORATOR",
		});
	});
});
