import { OrganizationFactory } from "::testing/factories";
import { describe, expect, it, vi } from "vitest";
import * as organizationActions from "@/actions/organization";
import type { API } from "@/types/api-types";
import { UserRole } from "@/types/user";

// Mock all organization actions
vi.mock("@/actions/organization");

describe("Organization API Actions", () => {
	const mockOrgId = "123e4567-e89b-12d3-a456-426614174000";
	const mockFirebaseUid = "firebase-uid-123";
	const mockInvitationId = "inv-123";
	const mockSourceId = "source-123";

	describe("Organization Management", () => {
		it("should create organization", async () => {
			const createData: API.CreateOrganization.RequestBody = {
				description: "Test description",
				name: "Test Organization",
			};

			const expectedResponse = OrganizationFactory.build();
			vi.mocked(organizationActions.createOrganization).mockResolvedValue(expectedResponse);

			const result = await organizationActions.createOrganization(createData);

			expect(organizationActions.createOrganization).toHaveBeenCalledWith(createData);
			expect(result).toEqual(expectedResponse);
		});

		it("should get all organizations", async () => {
			const expectedResponse = [OrganizationFactory.build(), OrganizationFactory.build()];
			vi.mocked(organizationActions.getOrganizations).mockResolvedValue(expectedResponse);

			const result = await organizationActions.getOrganizations();

			expect(organizationActions.getOrganizations).toHaveBeenCalled();
			expect(result).toEqual(expectedResponse);
		});

		it("should get single organization", async () => {
			const expectedResponse = OrganizationFactory.build();
			vi.mocked(organizationActions.getOrganization).mockResolvedValue(expectedResponse);

			const result = await organizationActions.getOrganization(mockOrgId);

			expect(organizationActions.getOrganization).toHaveBeenCalledWith(mockOrgId);
			expect(result).toEqual(expectedResponse);
		});

		it("should update organization", async () => {
			const updateData: API.UpdateOrganization.RequestBody = {
				name: "Updated Organization",
			};
			const expectedResponse = OrganizationFactory.build();
			vi.mocked(organizationActions.updateOrganization).mockResolvedValue(expectedResponse);

			const result = await organizationActions.updateOrganization(mockOrgId, updateData);

			expect(organizationActions.updateOrganization).toHaveBeenCalledWith(mockOrgId, updateData);
			expect(result).toEqual(expectedResponse);
		});

		it("should delete organization", async () => {
			const expectedResponse = { success: true };
			vi.mocked(organizationActions.deleteOrganization).mockResolvedValue(expectedResponse);

			const result = await organizationActions.deleteOrganization(mockOrgId);

			expect(organizationActions.deleteOrganization).toHaveBeenCalledWith(mockOrgId);
			expect(result).toEqual(expectedResponse);
		});
	});

	describe("Organization Members", () => {
		it("should get organization members", async () => {
			const expectedResponse = [
				{
					display_name: "Test User",
					email: "test@example.com",
					firebase_uid: mockFirebaseUid,
					joined_at: "2023-01-01T00:00:00Z",
					photo_url: null,
					role: UserRole.COLLABORATOR,
				},
			];
			vi.mocked(organizationActions.getOrganizationMembers).mockResolvedValue(expectedResponse);

			const result = await organizationActions.getOrganizationMembers(mockOrgId);

			expect(organizationActions.getOrganizationMembers).toHaveBeenCalledWith(mockOrgId);
			expect(result).toEqual(expectedResponse);
		});

		it("should add organization member", async () => {
			const memberData: API.AddOrganizationMember.RequestBody = {
				firebase_uid: mockFirebaseUid,
				role: UserRole.COLLABORATOR,
			};
			const expectedResponse = { success: true };
			vi.mocked(organizationActions.addOrganizationMember).mockResolvedValue(expectedResponse);

			const result = await organizationActions.addOrganizationMember(mockOrgId, memberData);

			expect(organizationActions.addOrganizationMember).toHaveBeenCalledWith(mockOrgId, memberData);
			expect(result).toEqual(expectedResponse);
		});
	});

	describe("Organization Invitations", () => {
		it("should create organization invitation", async () => {
			const invitationData: API.CreateOrganizationInvitation.RequestBody = {
				email: "invite@example.com",
				role: UserRole.COLLABORATOR,
			};
			const expectedResponse = {
				expires_at: "2023-01-01T00:00:00Z",
				token: "invite-token",
			};
			vi.mocked(organizationActions.createOrganizationInvitation).mockResolvedValue(expectedResponse);

			const result = await organizationActions.createOrganizationInvitation(mockOrgId, invitationData);

			expect(organizationActions.createOrganizationInvitation).toHaveBeenCalledWith(mockOrgId, invitationData);
			expect(result).toEqual(expectedResponse);
		});
	});

	describe("Organization Sources", () => {
		it("should create organization source upload URL", async () => {
			const fileName = "document.pdf";
			const expectedResponse = {
				rag_source_id: "source-123",
				upload_url: "https://storage.googleapis.com/bucket/file",
			};
			vi.mocked(organizationActions.createOrganizationSourceUploadUrl).mockResolvedValue(expectedResponse);

			const result = await organizationActions.createOrganizationSourceUploadUrl(mockOrgId, fileName);

			expect(organizationActions.createOrganizationSourceUploadUrl).toHaveBeenCalledWith(mockOrgId, fileName);
			expect(result).toEqual(expectedResponse);
		});
	});
});
