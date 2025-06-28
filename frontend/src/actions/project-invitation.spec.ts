import { readFile } from "node:fs/promises";
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

vi.mock("mailgun.js", () => ({
	default: class MockMailgun {
		client() {
			return {
				messages: {
					create: vi.fn(),
				},
			};
		}
	},
}));

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

		// Set environment variables
		process.env.NEXT_PUBLIC_APP_URL = "https://test.grantflow.ai";
	});

	afterEach(() => {
		process.env.NEXT_PUBLIC_APP_URL = undefined;
	});

	describe("inviteCollaborator", () => {
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
