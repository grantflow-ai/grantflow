import {
	AddOrganizationMemberRequestFactory,
	AddOrganizationMemberResponseFactory,
	CreateGrantingInstitutionRagSourceUploadUrlResponseFactory,
	CreateOrganizationInvitationRequestFactory,
	CreateOrganizationInvitationResponseFactory,
	CreateOrganizationRequestFactory,
	CreateOrganizationResponseFactory,
	GetOrganizationResponseFactory,
	ListOrganizationInvitationsResponseFactory,
	ListOrganizationMembersResponseFactory,
	ListOrganizationsResponseFactory,
	RestoreOrganizationResponseFactory,
	UpdateMemberRoleOrgRequestFactory,
	UpdateMemberRoleResponseFactory,
	UpdateOrganizationInvitationRequestFactory,
	UpdateOrganizationInvitationResponseFactory,
	UpdateOrganizationRequestFactory,
	UpdateOrganizationResponseFactory,
} from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";
import {
	addOrganizationMember,
	createOrganization,
	createOrganizationInvitation,
	createOrganizationSourceUploadUrl,
	deleteOrganization,
	deleteOrganizationInvitation,
	getOrganization,
	getOrganizationInvitations,
	getOrganizationMembers,
	getOrganizations,
	removeOrganizationMember,
	restoreOrganization,
	updateOrganization,
	updateOrganizationInvitation,
	updateOrganizationMemberRole,
} from "./organization";

// Mock the dependencies
vi.mock("@/utils/api");
vi.mock("@/utils/server-side");

let mockClient: any;

const mockGetClient = vi.mocked(getClient);
const mockCreateAuthHeaders = vi.mocked(createAuthHeaders);
const mockWithAuthRedirect = vi.mocked(withAuthRedirect);

describe("Organization Actions", () => {
	const organizationId = "org-123";
	const mockAuthHeaders = { Authorization: "Bearer token" };

	beforeEach(() => {
		vi.clearAllMocks();
		mockClient = {
			delete: vi.fn(),
			get: vi.fn(),
			patch: vi.fn(),
			post: vi.fn(),
		};
		mockGetClient.mockReturnValue(mockClient);
		mockCreateAuthHeaders.mockResolvedValue(mockAuthHeaders);
		mockWithAuthRedirect.mockImplementation((promise) => promise);
	});

	describe("addOrganizationMember", () => {
		it("should add organization member with correct parameters", async () => {
			const requestData = AddOrganizationMemberRequestFactory.build({
				firebase_uid: "user-123",
				role: "COLLABORATOR",
			});
			const responseData = AddOrganizationMemberResponseFactory.build({
				firebase_uid: "user-123",
				role: "COLLABORATOR",
			});

			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await addOrganizationMember(organizationId, requestData);

			expect(mockClient.post).toHaveBeenCalledWith(`organizations/${organizationId}/members`, {
				headers: mockAuthHeaders,
				json: requestData,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const requestData = AddOrganizationMemberRequestFactory.build();
			mockClient.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(addOrganizationMember(organizationId, requestData)).rejects.toThrow("API Error");
		});
	});

	describe("createOrganization", () => {
		it("should create organization with correct parameters", async () => {
			const requestData = CreateOrganizationRequestFactory.build();
			const responseData = CreateOrganizationResponseFactory.build({
				id: organizationId,
			});

			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await createOrganization(requestData);

			expect(mockClient.post).toHaveBeenCalledWith("organizations", {
				headers: mockAuthHeaders,
				json: requestData,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const requestData = CreateOrganizationRequestFactory.build();
			mockClient.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(createOrganization(requestData)).rejects.toThrow("API Error");
		});
	});

	describe("createOrganizationInvitation", () => {
		it("should create organization invitation with correct parameters", async () => {
			const requestData = CreateOrganizationInvitationRequestFactory.build({
				email: "test@example.com",
				role: "COLLABORATOR",
			});
			const responseData = CreateOrganizationInvitationResponseFactory.build();

			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await createOrganizationInvitation(organizationId, requestData);

			expect(mockClient.post).toHaveBeenCalledWith(`organizations/${organizationId}/invitations`, {
				headers: mockAuthHeaders,
				json: requestData,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const requestData = CreateOrganizationInvitationRequestFactory.build();
			mockClient.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(createOrganizationInvitation(organizationId, requestData)).rejects.toThrow("API Error");
		});
	});

	describe("createOrganizationSourceUploadUrl", () => {
		it("should create organization source upload URL with correct parameters", async () => {
			const fileName = "test-document.pdf";
			const responseData = CreateGrantingInstitutionRagSourceUploadUrlResponseFactory.build();

			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await createOrganizationSourceUploadUrl(organizationId, fileName);

			expect(mockClient.post).toHaveBeenCalledWith(`organizations/${organizationId}/sources/upload-url`, {
				headers: mockAuthHeaders,
				json: { file_name: fileName },
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const fileName = "test-document.pdf";
			mockClient.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(createOrganizationSourceUploadUrl(organizationId, fileName)).rejects.toThrow("API Error");
		});
	});

	describe("deleteOrganization", () => {
		it("should delete organization with correct parameters", async () => {
			const responseData = undefined;

			mockClient.delete.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await deleteOrganization(organizationId);

			expect(mockClient.delete).toHaveBeenCalledWith(`organizations/${organizationId}`, {
				headers: mockAuthHeaders,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			mockClient.delete.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(deleteOrganization(organizationId)).rejects.toThrow("API Error");
		});
	});

	describe("deleteOrganizationInvitation", () => {
		it("should delete organization invitation with correct parameters", async () => {
			const invitationId = "invitation-123";
			const responseData = undefined;

			mockClient.delete.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await deleteOrganizationInvitation(organizationId, invitationId);

			expect(mockClient.delete).toHaveBeenCalledWith(
				`organizations/${organizationId}/invitations/${invitationId}`,
				{
					headers: mockAuthHeaders,
				},
			);
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const invitationId = "invitation-123";
			mockClient.delete.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(deleteOrganizationInvitation(organizationId, invitationId)).rejects.toThrow("API Error");
		});
	});

	describe("getOrganization", () => {
		it("should get organization with correct parameters", async () => {
			const responseData = GetOrganizationResponseFactory.build({
				id: organizationId,
			});

			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await getOrganization(organizationId);

			expect(mockClient.get).toHaveBeenCalledWith(`organizations/${organizationId}`, {
				headers: mockAuthHeaders,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(getOrganization(organizationId)).rejects.toThrow("API Error");
		});
	});

	describe("getOrganizationInvitations", () => {
		it("should get organization invitations with correct parameters", async () => {
			const responseData = ListOrganizationInvitationsResponseFactory.build();

			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await getOrganizationInvitations(organizationId);

			expect(mockClient.get).toHaveBeenCalledWith(`organizations/${organizationId}/invitations`, {
				headers: mockAuthHeaders,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(getOrganizationInvitations(organizationId)).rejects.toThrow("API Error");
		});
	});

	describe("getOrganizationMembers", () => {
		it("should get organization members with correct parameters", async () => {
			const responseData = ListOrganizationMembersResponseFactory.build();

			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await getOrganizationMembers(organizationId);

			expect(mockClient.get).toHaveBeenCalledWith(`organizations/${organizationId}/members`, {
				headers: mockAuthHeaders,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(getOrganizationMembers(organizationId)).rejects.toThrow("API Error");
		});
	});

	describe("getOrganizations", () => {
		it("should get organizations with correct parameters", async () => {
			const responseData = ListOrganizationsResponseFactory.build();

			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await getOrganizations();

			expect(mockClient.get).toHaveBeenCalledWith("organizations", {
				headers: mockAuthHeaders,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(getOrganizations()).rejects.toThrow("API Error");
		});
	});

	describe("removeOrganizationMember", () => {
		it("should remove organization member with correct parameters", async () => {
			const firebaseUid = "user-123";
			const responseData = undefined;

			mockClient.delete.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await removeOrganizationMember(organizationId, firebaseUid);

			expect(mockClient.delete).toHaveBeenCalledWith(`organizations/${organizationId}/members/${firebaseUid}`, {
				headers: mockAuthHeaders,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const firebaseUid = "user-123";
			mockClient.delete.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(removeOrganizationMember(organizationId, firebaseUid)).rejects.toThrow("API Error");
		});
	});

	describe("restoreOrganization", () => {
		it("should restore organization with correct parameters", async () => {
			const responseData = RestoreOrganizationResponseFactory.build({
				id: organizationId,
			});

			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await restoreOrganization(organizationId);

			expect(mockClient.post).toHaveBeenCalledWith(`organizations/${organizationId}/restore`, {
				headers: mockAuthHeaders,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			mockClient.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(restoreOrganization(organizationId)).rejects.toThrow("API Error");
		});
	});

	describe("updateOrganization", () => {
		it("should update organization with correct parameters", async () => {
			const requestData = UpdateOrganizationRequestFactory.build();
			const responseData = UpdateOrganizationResponseFactory.build({
				id: organizationId,
			});

			mockClient.patch.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await updateOrganization(organizationId, requestData);

			expect(mockClient.patch).toHaveBeenCalledWith(`organizations/${organizationId}`, {
				headers: mockAuthHeaders,
				json: requestData,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const requestData = UpdateOrganizationRequestFactory.build();
			mockClient.patch.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(updateOrganization(organizationId, requestData)).rejects.toThrow("API Error");
		});
	});

	describe("updateOrganizationInvitation", () => {
		it("should update organization invitation with correct parameters", async () => {
			const invitationId = "invitation-123";
			const requestData = UpdateOrganizationInvitationRequestFactory.build({
				role: "ADMIN",
			});
			const responseData = UpdateOrganizationInvitationResponseFactory.build();

			mockClient.patch.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await updateOrganizationInvitation(organizationId, invitationId, requestData);

			expect(mockClient.patch).toHaveBeenCalledWith(
				`organizations/${organizationId}/invitations/${invitationId}`,
				{
					headers: mockAuthHeaders,
					json: requestData,
				},
			);
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const invitationId = "invitation-123";
			const requestData = UpdateOrganizationInvitationRequestFactory.build();
			mockClient.patch.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(updateOrganizationInvitation(organizationId, invitationId, requestData)).rejects.toThrow(
				"API Error",
			);
		});
	});

	describe("updateOrganizationMemberRole", () => {
		it("should update organization member role with correct parameters", async () => {
			const firebaseUid = "user-123";
			const requestData = UpdateMemberRoleOrgRequestFactory.build({
				role: "ADMIN",
			});
			const responseData = UpdateMemberRoleResponseFactory.build({
				firebase_uid: firebaseUid,
				role: "ADMIN",
			});

			mockClient.patch.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await updateOrganizationMemberRole(organizationId, firebaseUid, requestData);

			expect(mockClient.patch).toHaveBeenCalledWith(`organizations/${organizationId}/members/${firebaseUid}`, {
				headers: mockAuthHeaders,
				json: requestData,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const firebaseUid = "user-123";
			const requestData = UpdateMemberRoleOrgRequestFactory.build();
			mockClient.patch.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(updateOrganizationMemberRole(organizationId, firebaseUid, requestData)).rejects.toThrow(
				"API Error",
			);
		});
	});

	describe("withAuthRedirect integration", () => {
		it("should call withAuthRedirect for all functions", async () => {
			const mockJson = vi.fn().mockResolvedValue({});
			mockClient.get.mockReturnValue({ json: mockJson });
			mockClient.post.mockReturnValue({ json: mockJson });
			mockClient.patch.mockReturnValue({ json: mockJson });
			mockClient.delete.mockReturnValue({ json: mockJson });

			await createOrganization(CreateOrganizationRequestFactory.build());
			await getOrganization(organizationId);
			await getOrganizations();
			await updateOrganization(organizationId, UpdateOrganizationRequestFactory.build());
			await deleteOrganization(organizationId);
			await restoreOrganization(organizationId);
			await addOrganizationMember(organizationId, AddOrganizationMemberRequestFactory.build());
			await getOrganizationMembers(organizationId);
			await removeOrganizationMember(organizationId, "user-123");
			await updateOrganizationMemberRole(organizationId, "user-123", UpdateMemberRoleOrgRequestFactory.build());
			await createOrganizationInvitation(organizationId, CreateOrganizationInvitationRequestFactory.build());
			await getOrganizationInvitations(organizationId);
			await updateOrganizationInvitation(
				organizationId,
				"invitation-123",
				UpdateOrganizationInvitationRequestFactory.build(),
			);
			await deleteOrganizationInvitation(organizationId, "invitation-123");
			await createOrganizationSourceUploadUrl(organizationId, "test.pdf");

			expect(mockWithAuthRedirect).toHaveBeenCalledTimes(15);
		});
	});

	describe("createAuthHeaders integration", () => {
		it("should call createAuthHeaders for all functions", async () => {
			const mockJson = vi.fn().mockResolvedValue({});
			mockClient.get.mockReturnValue({ json: mockJson });
			mockClient.post.mockReturnValue({ json: mockJson });
			mockClient.patch.mockReturnValue({ json: mockJson });
			mockClient.delete.mockReturnValue({ json: mockJson });

			await createOrganization(CreateOrganizationRequestFactory.build());
			await getOrganization(organizationId);
			await getOrganizations();
			await updateOrganization(organizationId, UpdateOrganizationRequestFactory.build());
			await deleteOrganization(organizationId);
			await restoreOrganization(organizationId);
			await addOrganizationMember(organizationId, AddOrganizationMemberRequestFactory.build());
			await getOrganizationMembers(organizationId);
			await removeOrganizationMember(organizationId, "user-123");
			await updateOrganizationMemberRole(organizationId, "user-123", UpdateMemberRoleOrgRequestFactory.build());
			await createOrganizationInvitation(organizationId, CreateOrganizationInvitationRequestFactory.build());
			await getOrganizationInvitations(organizationId);
			await updateOrganizationInvitation(
				organizationId,
				"invitation-123",
				UpdateOrganizationInvitationRequestFactory.build(),
			);
			await deleteOrganizationInvitation(organizationId, "invitation-123");
			await createOrganizationSourceUploadUrl(organizationId, "test.pdf");

			expect(mockCreateAuthHeaders).toHaveBeenCalledTimes(15);
		});
	});
});
