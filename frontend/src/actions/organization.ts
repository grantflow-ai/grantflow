"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function addOrganizationMember(organizationId: string, data: API.AddOrganizationMember.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/members`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.AddOrganizationMember.ResponseBody>(),
	);
}

export async function crawlOrganizationUrl(organizationId: string, url: string) {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/sources/crawl-url`, {
				headers: await createAuthHeaders(),
				json: { url },
			})
			.json<API.CrawlGrantingInstitutionUrl.ResponseBody>(),
	);
}

// Organization Management
export async function createOrganization(data: API.CreateOrganization.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post("organizations", {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.CreateOrganization.ResponseBody>(),
	);
}

// Organization Invitations
export async function createOrganizationInvitation(
	organizationId: string,
	data: API.CreateOrganizationInvitation.RequestBody,
) {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/invitations`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.CreateOrganizationInvitation.ResponseBody>(),
	);
}

// Organization-Scoped Sources (Granting Institutions)
export async function createOrganizationSourceUploadUrl(organizationId: string, fileName: string) {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/sources/upload-url`, {
				headers: await createAuthHeaders(),
				json: { file_name: fileName },
			})
			.json<API.CreateGrantingInstitutionRagSourceUploadUrl.ResponseBody>(),
	);
}

export async function deleteOrganization(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.delete(`organizations/${organizationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.DeleteOrganization.ResponseBody>(),
	);
}

export async function deleteOrganizationInvitation(organizationId: string, invitationId: string) {
	return withAuthRedirect(
		getClient()
			.delete(`organizations/${organizationId}/invitations/${invitationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.DeleteOrganizationInvitation.ResponseBody>(),
	);
}

export async function deleteOrganizationSource(organizationId: string, sourceId: string) {
	return withAuthRedirect(
		getClient()
			.delete(`organizations/${organizationId}/sources/${sourceId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.DeleteGrantingInstitutionRagSource.ResponseBody>(),
	);
}

export async function getOrganization(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.GetOrganization.ResponseBody>(),
	);
}

export async function getOrganizationInvitations(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}/invitations`, {
				headers: await createAuthHeaders(),
			})
			.json<API.ListOrganizationInvitations.ResponseBody>(),
	);
}

// Organization Members
export async function getOrganizationMembers(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}/members`, {
				headers: await createAuthHeaders(),
			})
			.json<API.ListOrganizationMembers.ResponseBody>(),
	);
}

export async function getOrganizations() {
	return withAuthRedirect(
		getClient()
			.get("organizations", {
				headers: await createAuthHeaders(),
			})
			.json<API.ListOrganizations.ResponseBody>(),
	);
}

export async function getOrganizationSources(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}/sources`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RetrieveGrantingInstitutionRagSources.ResponseBody>(),
	);
}

export async function removeOrganizationMember(organizationId: string, firebaseUid: string) {
	return withAuthRedirect(
		getClient()
			.delete(`organizations/${organizationId}/members/${firebaseUid}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RemoveMember.ResponseBody>(),
	);
}

export async function restoreOrganization(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/restore`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RestoreOrganization.ResponseBody>(),
	);
}

export async function updateOrganization(organizationId: string, data: API.UpdateOrganization.RequestBody) {
	return withAuthRedirect(
		getClient()
			.patch(`organizations/${organizationId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateOrganization.ResponseBody>(),
	);
}

export async function updateOrganizationInvitation(
	organizationId: string,
	invitationId: string,
	data: API.UpdateOrganizationInvitation.RequestBody,
) {
	return withAuthRedirect(
		getClient()
			.patch(`organizations/${organizationId}/invitations/${invitationId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateOrganizationInvitation.ResponseBody>(),
	);
}

export async function updateOrganizationMemberRole(
	organizationId: string,
	firebaseUid: string,
	data: API.UpdateMemberRole.RequestBody,
) {
	return withAuthRedirect(
		getClient()
			.patch(`organizations/${organizationId}/members/${firebaseUid}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateMemberRole.ResponseBody>(),
	);
}
