"use server";

import type { API } from "@/types";
import { getClient } from "@/utils/api/server";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function addOrganizationMember(organizationId: string, data: API.AddOrganizationMember.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/members`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.AddOrganizationMember.Http201.ResponseBody>(),
	);
}

export async function createOrganization(data: API.CreateOrganization.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post("organizations", {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.CreateOrganization.Http201.ResponseBody>(),
	);
}

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
			.json<API.CreateOrganizationInvitation.Http201.ResponseBody>(),
	);
}

export async function createOrganizationSourceUploadUrl(organizationId: string, fileName: string) {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/sources/upload-url`, {
				headers: await createAuthHeaders(),
				json: { file_name: fileName },
			})
			.json<API.CreateGrantingInstitutionRagSourceUploadUrl.Http201.ResponseBody>(),
	);
}

export async function deleteOrganization(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.delete(`organizations/${organizationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.DeleteOrganization.Http200.ResponseBody>(),
	);
}

export async function deleteOrganizationInvitation(organizationId: string, invitationId: string) {
	return withAuthRedirect(
		getClient()
			.delete(`organizations/${organizationId}/invitations/${invitationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.DeleteOrganizationInvitation.Http204.ResponseBody>(),
	);
}

export async function getOrganization(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.GetOrganization.Http200.ResponseBody>(),
	);
}

export async function getOrganizationInvitations(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}/invitations`, {
				headers: await createAuthHeaders(),
			})
			.json<API.ListOrganizationInvitations.Http200.ResponseBody>(),
	);
}

export async function getOrganizationMembers(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}/members`, {
				headers: await createAuthHeaders(),
			})
			.json<API.ListOrganizationMembers.Http200.ResponseBody>(),
	);
}

export async function getOrganizations() {
	return withAuthRedirect(
		getClient()
			.get("organizations", {
				headers: await createAuthHeaders(),
			})
			.json<API.ListOrganizations.Http200.ResponseBody>(),
	);
}

export async function removeOrganizationMember(organizationId: string, firebaseUid: string) {
	return withAuthRedirect(
		getClient()
			.delete(`organizations/${organizationId}/members/${firebaseUid}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RemoveMember.Http204.ResponseBody>(),
	);
}

export async function restoreOrganization(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/restore`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RestoreOrganization.Http200.ResponseBody>(),
	);
}

export async function updateOrganization(organizationId: string, data: API.UpdateOrganization.RequestBody) {
	return withAuthRedirect(
		getClient()
			.patch(`organizations/${organizationId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateOrganization.Http200.ResponseBody>(),
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
			.json<API.UpdateOrganizationInvitation.Http200.ResponseBody>(),
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
			.json<API.UpdateMemberRole.Http200.ResponseBody>(),
	);
}
