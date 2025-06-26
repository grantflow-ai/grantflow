"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function createApplication(
	projectId: string,
	data: API.CreateApplication.RequestBody,
): Promise<API.CreateApplication.Http201.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.post(`projects/${projectId}/applications`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.CreateApplication.Http201.ResponseBody>(),
	);
}

export async function deleteApplication(projectId: string, applicationId: string): Promise<void> {
	await withAuthRedirect(
		getClient().delete(`projects/${projectId}/applications/${applicationId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function generateApplication(projectId: string, applicationId: string): Promise<void> {
	await withAuthRedirect(
		getClient().post(`projects/${projectId}/applications/${applicationId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function retrieveApplication(
	projectId: string,
	applicationId: string,
): Promise<API.RetrieveApplication.Http200.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.get(`projects/${projectId}/applications/${applicationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RetrieveApplication.Http200.ResponseBody>(),
	);
}

export async function updateApplication(
	projectId: string,
	applicationId: string,
	data: Partial<API.UpdateApplication.RequestBody>,
): Promise<API.UpdateApplication.Http200.ResponseBody> {
	return await withAuthRedirect(
		getClient()
			.patch(`projects/${projectId}/applications/${applicationId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateApplication.Http200.ResponseBody>(),
	);
}
