"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api/server";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function crawlGrantingInstitutionUrl(id: string, url: string) {
	return withAuthRedirect(
		getClient()
			.post(`granting-institutions/${id}/sources/crawl-url`, {
				headers: await createAuthHeaders(),
				json: { url },
			})
			.json<API.CrawlGrantingInstitutionUrl.Http201.ResponseBody>(),
	);
}

export async function createGrantingInstitution(data: API.CreateGrantingInstitution.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post("granting-institutions", {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.CreateGrantingInstitution.Http201.ResponseBody>(),
	);
}

export async function createGrantingInstitutionUploadUrl(id: string, blobName: string) {
	return withAuthRedirect(
		getClient()
			.post(`granting-institutions/${id}/sources/upload-url?blob_name=${encodeURIComponent(blobName)}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.CreateGrantingInstitutionRagSourceUploadUrl.Http201.ResponseBody>(),
	);
}

export async function deleteGrantingInstitution(id: string) {
	return withAuthRedirect(
		getClient()
			.delete(`granting-institutions/${id}`, {
				headers: await createAuthHeaders(),
			})
			.json<void>(),
	);
}

export async function deleteGrantingInstitutionSource(id: string, sourceId: string) {
	return withAuthRedirect(
		getClient()
			.delete(`granting-institutions/${id}/sources/${sourceId}`, {
				headers: await createAuthHeaders(),
			})
			.json<void>(),
	);
}

export async function getGrantingInstitution(id: string) {
	return withAuthRedirect(
		getClient()
			.get(`granting-institutions/${id}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.GetGrantingInstitution.Http200.ResponseBody>(),
	);
}

export async function getGrantingInstitutionSources(id: string) {
	return withAuthRedirect(
		getClient()
			.get(`granting-institutions/${id}/sources`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RetrieveGrantingInstitutionRagSources.Http200.ResponseBody>(),
	);
}

export async function listGrantingInstitutions() {
	return withAuthRedirect(
		getClient()
			.get("granting-institutions", {
				headers: await createAuthHeaders(),
			})
			.json<API.ListGrantingInstitutions.Http200.ResponseBody>(),
	);
}

export async function updateGrantingInstitution(id: string, data: API.UpdateGrantingInstitution.RequestBody) {
	return withAuthRedirect(
		getClient()
			.patch(`granting-institutions/${id}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateGrantingInstitution.Http200.ResponseBody>(),
	);
}
