"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api/server";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function acceptInvitation(invitationId: string) {
	return withAuthRedirect(
		getClient()
			.post(`projects/invitations/${invitationId}/accept`, {
				headers: await createAuthHeaders(),
			})
			.json<API.AcceptInvitation.Http200.ResponseBody>(),
	);
}

export async function createInvitation(
	organizationId: string,
	projectId: string,
	data: API.CreateInvitationRedirectUrl.RequestBody,
) {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/projects/${projectId}/create-invitation-redirect-url`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.CreateInvitationRedirectUrl.Http201.ResponseBody>(),
	);
}

export async function createProject(organizationId: string, data: API.CreateProject.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/projects`, { headers: await createAuthHeaders(), json: data })
			.json<API.CreateProject.Http201.ResponseBody>(),
	);
}

export async function deleteInvitation(organizationId: string, projectId: string, invitationId: string) {
	await withAuthRedirect(
		getClient().delete(`organizations/${organizationId}/projects/${projectId}/invitations/${invitationId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function deleteProject(organizationId: string, projectId: string) {
	await withAuthRedirect(
		getClient().delete(`organizations/${organizationId}/projects/${projectId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function duplicateProject(organizationId: string, projectId: string) {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/projects/${projectId}/duplicate`, {
				headers: await createAuthHeaders(),
				json: {},
			})
			.json<API.DuplicateProject.Http201.ResponseBody>(),
	);
}

export async function getProject(organizationId: string, projectId: string) {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}/projects/${projectId}`, { headers: await createAuthHeaders() })
			.json<API.GetProject.Http200.ResponseBody>(),
	);
}

export async function getProjectMembers(organizationId: string, projectId: string) {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}/projects/${projectId}/members`, {
				headers: await createAuthHeaders(),
			})
			.json<API.ListProjectMembers.Http200.ResponseBody>(),
	);
}

export async function getProjects(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}/projects`, { headers: await createAuthHeaders() })
			.json<API.ListProjects.Http200.ResponseBody>(),
	);
}

export async function removeProjectMember(organizationId: string, projectId: string, firebaseUid: string) {
	await withAuthRedirect(
		getClient().delete(`organizations/${organizationId}/projects/${projectId}/members/${firebaseUid}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function updateInvitationRole(
	organizationId: string,
	projectId: string,
	invitationId: string,
	data: API.UpdateInvitationRole.RequestBody,
) {
	return withAuthRedirect(
		getClient()
			.patch(`organizations/${organizationId}/projects/${projectId}/invitations/${invitationId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateInvitationRole.Http200.ResponseBody>(),
	);
}

export async function updateProject(organizationId: string, projectId: string, data: API.UpdateProject.RequestBody) {
	return withAuthRedirect(
		getClient()
			.patch(`organizations/${organizationId}/projects/${projectId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateProject.Http200.ResponseBody>(),
	);
}

export async function updateProjectMemberRole(
	organizationId: string,
	projectId: string,
	firebaseUid: string,
	data: API.UpdateProjectMemberRole.RequestBody,
) {
	return withAuthRedirect(
		getClient()
			.patch(`organizations/${organizationId}/projects/${projectId}/members/${firebaseUid}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateProjectMemberRole.Http200.ResponseBody>(),
	);
}
