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
			const expectedResponse: API.ListOrganizations.Http200.ResponseBody = [
				{
					description: "Test org 1",
					id: "org-1",
					logo_url: null,
					members_count: 5,
					name: "Organization 1",
					projects_count: 3,
					role: "OWNER",
				},
				{
					description: "Test org 2",
					id: "org-2",
					logo_url: null,
					members_count: 3,
					name: "Organization 2",
					projects_count: 1,
					role: "ADMIN",
				},
			];
			vi.mocked(organizationActions.getOrganizations).mockResolvedValue(expectedResponse);

			const result = await organizationActions.getOrganizations();

			expect(organizationActions.getOrganizations).toHaveBeenCalled();
			expect(result).toEqual(expectedResponse);
		});

		it("should get single organization", async () => {
			const expectedResponse: API.GetOrganization.Http200.ResponseBody = {
				contact_email: "test@example.com",
				contact_person_name: "John Doe",
				created_at: "2023-01-01T00:00:00Z",
				description: "Test organization description",
				id: mockOrgId,
				institutional_affiliation: "Test University",
				logo_url: null,
				name: "Test Org",
				role: "OWNER",
				updated_at: "2023-01-01T00:00:00Z",
			};
			vi.mocked(organizationActions.getOrganization).mockResolvedValue(expectedResponse);

			const result = await organizationActions.getOrganization(mockOrgId);

			expect(organizationActions.getOrganization).toHaveBeenCalledWith(mockOrgId);
			expect(result).toEqual(expectedResponse);
		});

		it("should update organization", async () => {
			const updateData: API.UpdateOrganization.RequestBody = {
				contact_email: "updated@example.com",
				contact_person_name: "Jane Doe",
				description: "Updated description",
				institutional_affiliation: "Updated University",
				logo_url: null,
				name: "Updated Organization",
			};
			const expectedResponse: API.UpdateOrganization.Http200.ResponseBody = {
				contact_email: "updated@example.com",
				contact_person_name: "Jane Doe",
				created_at: "2023-01-01T00:00:00Z",
				description: "Updated description",
				id: mockOrgId,
				institutional_affiliation: "Updated University",
				logo_url: null,
				name: "Updated Organization",
				role: "OWNER",
				updated_at: "2023-01-02T00:00:00Z",
			};
			vi.mocked(organizationActions.updateOrganization).mockResolvedValue(expectedResponse);

			const result = await organizationActions.updateOrganization(mockOrgId, updateData);

			expect(organizationActions.updateOrganization).toHaveBeenCalledWith(mockOrgId, updateData);
			expect(result).toEqual(expectedResponse);
		});

		it("should delete organization", async () => {
			const expectedResponse: API.DeleteOrganization.Http200.ResponseBody = {
				grace_period_days: 30,
				message: "Organization scheduled for deletion",
				restoration_info: "Organization can be restored within 30 days",
				scheduled_deletion_date: "2023-01-31T00:00:00Z",
			};
			vi.mocked(organizationActions.deleteOrganization).mockResolvedValue(expectedResponse);

			const result = await organizationActions.deleteOrganization(mockOrgId);

			expect(organizationActions.deleteOrganization).toHaveBeenCalledWith(mockOrgId);
			expect(result).toEqual(expectedResponse);
		});
	});

	describe("Organization Members", () => {
		it("should get organization members", async () => {
			const expectedResponse: API.ListOrganizationMembers.Http200.ResponseBody = [
				{
					created_at: "2023-01-01T00:00:00Z",
					firebase_uid: mockFirebaseUid,
					has_all_projects_access: true,
					project_access: [],
					role: "COLLABORATOR",
					updated_at: "2023-01-01T00:00:00Z",
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
			const expectedResponse: API.AddOrganizationMember.Http201.ResponseBody = {
				firebase_uid: mockFirebaseUid,
				message: "Member added successfully",
				role: "COLLABORATOR",
			};
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
			const expectedResponse: API.CreateGrantingInstitutionRagSourceUploadUrl.Http201.ResponseBody = {
				source_id: "source-123",
				url: "https://storage.googleapis.com/bucket/file",
			};
			vi.mocked(organizationActions.createOrganizationSourceUploadUrl).mockResolvedValue(expectedResponse);

			const result = await organizationActions.createOrganizationSourceUploadUrl(mockOrgId, fileName);

			expect(organizationActions.createOrganizationSourceUploadUrl).toHaveBeenCalledWith(mockOrgId, fileName);
			expect(result).toEqual(expectedResponse);
		});
	});
});
