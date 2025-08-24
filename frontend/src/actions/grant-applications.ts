"use server";

import type { API } from "@/types";
import { getClient } from "@/utils/api/server";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function createApplication(
	organizationId: string,
	projectId: string,
	data: API.CreateApplication.RequestBody,
): Promise<API.CreateApplication.Http201.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/projects/${projectId}/applications`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.CreateApplication.Http201.ResponseBody>(),
	);
}

export async function deleteApplication(
	organizationId: string,
	projectId: string,
	applicationId: string,
): Promise<void> {
	await withAuthRedirect(
		getClient().delete(`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function duplicateApplication(
	organizationId: string,
	projectId: string,
	applicationId: string,
	title: string,
): Promise<API.RetrieveApplication.Http200.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}/duplicate`, {
				headers: await createAuthHeaders(),
				json: { title },
			})
			.json<API.RetrieveApplication.Http200.ResponseBody>(),
	);
}

export async function generateApplication(
	organizationId: string,
	projectId: string,
	applicationId: string,
): Promise<void> {
	await withAuthRedirect(
		getClient().post(`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function getApplication(
	organizationId: string,
	projectId: string,
	applicationId: string,
): Promise<API.RetrieveApplication.Http200.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RetrieveApplication.Http200.ResponseBody>(),
	);
}

export async function listApplications(
	organizationId: string,
	projectId: string,
	params?: {
		limit?: number;
		offset?: number;
		order?: string;
		search?: string;
		sort?: string;
		status?: string;
	},
): Promise<API.ListApplications.Http200.ResponseBody> {
	const searchParams = new URLSearchParams();

	if (params?.search) searchParams.set("search", params.search);
	if (params?.status) searchParams.set("status", params.status);
	if (params?.sort) searchParams.set("sort", params.sort);
	if (params?.order) searchParams.set("order", params.order);
	if (params?.limit !== undefined) searchParams.set("limit", params.limit.toString());
	if (params?.offset !== undefined) searchParams.set("offset", params.offset.toString());

	const queryString = searchParams.toString();
	const baseUrl = `organizations/${organizationId}/projects/${projectId}/applications`;
	const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

	return withAuthRedirect(
		getClient()
			.get(url, {
				headers: await createAuthHeaders(),
			})
			.json<API.ListApplications.Http200.ResponseBody>(),
	);
}

export async function listOrganizationApplications(
	organizationId: string,
): Promise<API.ListOrganizationApplications.Http200.ResponseBody> {
	const url = `organizations/${organizationId}/applications`;

	return withAuthRedirect(
		getClient()
			.get(url, {
				headers: await createAuthHeaders(),
			})
			.json<API.ListOrganizationApplications.Http200.ResponseBody>(),
	);
}

export async function triggerAutofill(
	organizationId: string,
	projectId: string,
	applicationId: string,
	data: API.TriggerAutofill.RequestBody,
): Promise<API.TriggerAutofill.Http201.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}/autofill`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.TriggerAutofill.Http201.ResponseBody>(),
	);
}

export async function updateApplication(
	organizationId: string,
	projectId: string,
	applicationId: string,
	data: Partial<API.UpdateApplication.RequestBody>,
): Promise<API.UpdateApplication.Http200.ResponseBody> {
	return await withAuthRedirect(
		getClient()
			.patch(`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateApplication.Http200.ResponseBody>(),
	);
}
