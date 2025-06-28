import { readFile } from "node:fs/promises";
import path from "node:path";
import {
	getInvitationEmailTemplateHtml,
	invitationEmailTemplateText,
} from "@/components/email-templates/invitation-email-template";
import { getClient } from "@/utils/api";
import { logError } from "@/utils/logging";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";
import { inviteCollaborator } from "./project-invitation";

// Mock dependencies
vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs/promises")>();
	return {
		...actual,
		readFile: vi.fn(),
	};
});

const mockMailgunCreate = vi.fn();

vi.mock("mailgun.js", () => {
	return {
		default: vi.fn(() => ({
			client: vi.fn(() => ({
				messages: {
					create: mockMailgunCreate,
				},
			})),
		})),
	};
});

vi.mock("@/utils/api", () => ({
	getClient: vi.fn(() => ({
		post: vi.fn(),
	})),
}));

vi.mock("@/utils/server-side", () => ({
	createAuthHeaders: vi.fn(),
	withAuthRedirect: vi.fn((promise) => promise),
}));

vi.mock("@/utils/env", () => ({
	getEnv: vi.fn(() => ({
		NEXT_PUBLIC_MAILGUN_API_KEY: "mock-mailgun-key",
	})),
}));

vi.mock("@/utils/logging", () => ({
	logError: vi.fn(),
}));

vi.mock("@/components/email-templates/invitation-email-template", () => ({
	getInvitationEmailTemplateHtml: vi.fn(),
	invitationEmailTemplateText: vi.fn(),
}));

describe("Project Invitation Actions", () => {
	const mockClient = {
		post: vi.fn(),
	};

	const mockCreateAuthHeaders = vi.mocked(createAuthHeaders);
	const mockWithAuthRedirect = vi.mocked(withAuthRedirect);
	const mockGetClient = vi.mocked(getClient);
	const mockLogError = vi.mocked(logError);
	const mockReadFile = vi.mocked(readFile);
	const mockGetInvitationEmailTemplateHtml = vi.mocked(getInvitationEmailTemplateHtml);
	const mockInvitationEmailTemplateText = vi.mocked(invitationEmailTemplateText);

	const mockInvitationParams = {
		email: "collaborator@example.com",
		inviterName: "John Doe",
		projectId: "project-123",
		projectName: "Research Project",
		role: "member" as const,
	};

	const mockLogoBuffer = Buffer.from("mock-logo-data");

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetClient.mockReturnValue(mockClient as any);
		mockCreateAuthHeaders.mockResolvedValue({ Authorization: "Bearer mock-token" });
		mockWithAuthRedirect.mockImplementation((promise) => promise);
		mockReadFile.mockResolvedValue(mockLogoBuffer);
		mockGetInvitationEmailTemplateHtml.mockReturnValue("<html>Mock HTML</html>");
		mockInvitationEmailTemplateText.mockReturnValue("Mock text email");

		// Setup Mailgun mock - the mock is already configured in vi.mock above

		// Set environment variables
		process.env.NEXT_PUBLIC_APP_URL = "https://test.grantflow.ai";
	});

	afterEach(() => {
		process.env.NEXT_PUBLIC_APP_URL = undefined;
	});

	describe("inviteCollaborator", () => {
		it("should successfully create invitation and send email", async () => {
			// Mock successful API response
			const mockApiResponse = { token: "invitation-token-123" };
			const mockJson = vi.fn().mockResolvedValue(mockApiResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;

			// Mock successful email sending
			mockMailgunCreate.mockResolvedValue({ status: 200 });

			const result = await inviteCollaborator(mockInvitationParams);

			// Verify API call
			expect(mockPost).toHaveBeenCalledWith("projects/project-123/create-invitation-redirect-url", {
				headers: { Authorization: "Bearer mock-token" },
				json: {
					email: "collaborator@example.com",
					role: "MEMBER",
				},
			});

			// Verify email sending
			expect(mockMailgunCreate).toHaveBeenCalledWith("grantflow.ai", {
				from: "noreply@grantflow.ai",
				html: "<html>Mock HTML</html>",
				inline: [{ data: mockLogoBuffer, filename: "logo.png" }],
				subject: "Invitation to Collaborate on a Research Project in GrantFlow",
				text: "Mock text email",
				to: "collaborator@example.com",
			});

			expect(result).toEqual({
				invitationId: "https://test.grantflow.ai/invite?token=invitation-token-123",
				success: true,
			});
		});

		it("should handle admin role correctly", async () => {
			const adminParams = { ...mockInvitationParams, role: "admin" as const };
			const mockApiResponse = { token: "admin-token-123" };
			const mockJson = vi.fn().mockResolvedValue(mockApiResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;
			mockMailgunCreate.mockResolvedValue({ status: 200 });

			await inviteCollaborator(adminParams);

			expect(mockPost).toHaveBeenCalledWith("projects/project-123/create-invitation-redirect-url", {
				headers: { Authorization: "Bearer mock-token" },
				json: {
					email: "collaborator@example.com",
					role: "ADMIN",
				},
			});
		});

		it("should handle API error when creating invitation", async () => {
			const mockError = new Error("Failed to create invitation");
			const mockJson = vi.fn().mockRejectedValue(mockError);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;

			const result = await inviteCollaborator(mockInvitationParams);

			expect(result).toEqual({
				error: "Failed to create invitation",
				success: false,
			});

			expect(mockLogError).toHaveBeenCalledWith({
				error: "Failed to create invitation",
				identifier: "inviteCollaborator",
			});
		});

		it("should handle missing token in API response", async () => {
			const mockApiResponse = {}; // No token
			const mockJson = vi.fn().mockResolvedValue(mockApiResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;

			const result = await inviteCollaborator(mockInvitationParams);

			expect(result).toEqual({
				error: "Failed to create invitation token",
				success: false,
			});

			expect(mockLogError).toHaveBeenCalledWith({
				error: "Failed to create invitation token",
				identifier: "inviteCollaborator",
			});
		});

		it("should handle email sending failure gracefully", async () => {
			// Mock successful API response
			const mockApiResponse = { token: "invitation-token-123" };
			const mockJson = vi.fn().mockResolvedValue(mockApiResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;

			// Mock email sending failure
			mockMailgunCreate.mockRejectedValue(new Error("Email service unavailable"));

			const result = await inviteCollaborator(mockInvitationParams);

			expect(result).toEqual({
				error: "Invitation created but email delivery failed. Please share the invitation link manually.",
				invitationId: "https://test.grantflow.ai/invite?token=invitation-token-123",
				success: true,
			});

			expect(mockLogError).toHaveBeenCalledWith({
				error: "Failed to send invitation email: Email service unavailable",
				identifier: "inviteCollaborator",
			});
		});

		it("should handle email sending HTTP error response", async () => {
			// Mock successful API response
			const mockApiResponse = { token: "invitation-token-123" };
			const mockJson = vi.fn().mockResolvedValue(mockApiResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;

			// Mock email sending HTTP error
			mockMailgunCreate.mockResolvedValue({
				details: "Service temporarily unavailable",
				message: "Internal Server Error",
				status: 500,
			});

			const result = await inviteCollaborator(mockInvitationParams);

			expect(result).toEqual({
				error: "Invitation created but email delivery failed. Please share the invitation link manually.",
				invitationId: "https://test.grantflow.ai/invite?token=invitation-token-123",
				success: true,
			});
		});

		it("should use default app URL when environment variable is not set", async () => {
			process.env.NEXT_PUBLIC_APP_URL = undefined;

			const mockApiResponse = { token: "invitation-token-123" };
			const mockJson = vi.fn().mockResolvedValue(mockApiResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;
			mockMailgunCreate.mockResolvedValue({ status: 200 });

			const result = await inviteCollaborator(mockInvitationParams);

			expect(result.invitationId).toBe("https://app.grantflow.ai/invite?token=invitation-token-123");
		});

		it("should load logo file correctly", async () => {
			const mockApiResponse = { token: "invitation-token-123" };
			const mockJson = vi.fn().mockResolvedValue(mockApiResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;
			mockMailgunCreate.mockResolvedValue({ status: 200 });

			await inviteCollaborator(mockInvitationParams);

			expect(mockReadFile).toHaveBeenCalledWith(path.resolve(process.cwd(), "public/assets/logo-small.png"));
		});

		it("should call email template functions with correct parameters", async () => {
			const mockApiResponse = { token: "invitation-token-123" };
			const mockJson = vi.fn().mockResolvedValue(mockApiResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;
			mockMailgunCreate.mockResolvedValue({ status: 200 });

			await inviteCollaborator(mockInvitationParams);

			const expectedUrl = "https://test.grantflow.ai/invite?token=invitation-token-123";

			expect(mockGetInvitationEmailTemplateHtml).toHaveBeenCalledWith(
				"John Doe",
				"Research Project",
				expectedUrl,
			);

			expect(mockInvitationEmailTemplateText).toHaveBeenCalledWith("John Doe", "Research Project", expectedUrl);
		});

		it("should handle file reading error gracefully", async () => {
			const mockApiResponse = { token: "invitation-token-123" };
			const mockJson = vi.fn().mockResolvedValue(mockApiResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;

			// Mock file reading error
			mockReadFile.mockRejectedValue(new Error("File not found"));

			const result = await inviteCollaborator(mockInvitationParams);

			expect(result).toEqual({
				error: "Invitation created but email delivery failed. Please share the invitation link manually.",
				invitationId: "https://test.grantflow.ai/invite?token=invitation-token-123",
				success: true,
			});
		});

		it("should handle non-Error exceptions", async () => {
			const mockPost = vi.fn().mockReturnValue({
				json: vi.fn().mockRejectedValue("String error"),
			});
			mockClient.post = mockPost;

			const result = await inviteCollaborator(mockInvitationParams);

			expect(result).toEqual({
				error: "Failed to invite collaborator",
				success: false,
			});

			expect(mockLogError).toHaveBeenCalledWith({
				error: "Failed to invite collaborator",
				identifier: "inviteCollaborator",
			});
		});
	});
});
