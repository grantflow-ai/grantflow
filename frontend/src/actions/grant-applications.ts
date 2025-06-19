"use server";

import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

import type { API } from "@/types/api-types";

export async function createApplication(
	workspaceId: string,
	data: API.CreateApplication.RequestBody,
): Promise<API.CreateApplication.Http201.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/applications`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.CreateApplication.Http201.ResponseBody>(),
	);
}

export async function deleteApplication(workspaceId: string, applicationId: string): Promise<void> {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/applications/${applicationId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function generateApplication(workspaceId: string, applicationId: string): Promise<void> {
	await withAuthRedirect(
		getClient().post(`workspaces/${workspaceId}/applications/${applicationId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function retrieveApplication(
	workspaceId: string,
	applicationId: string,
): Promise<API.RetrieveApplication.Http200.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RetrieveApplication.Http200.ResponseBody>(),
	);
}

export async function updateApplication(
	workspaceId: string,
	applicationId: string,
	data: Partial<API.UpdateApplication.RequestBody>,
): Promise<API.UpdateApplication.Http200.ResponseBody> {
	return await withAuthRedirect(
		getClient()
			.patch(`workspaces/${workspaceId}/applications/${applicationId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateApplication.Http200.ResponseBody>(),
	);
}
