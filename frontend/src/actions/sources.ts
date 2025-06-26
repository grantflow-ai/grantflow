"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function crawlApplicationUrl(
	projectId: string,
	applicationId: string,
	url: string,
): Promise<API.CrawlGrantApplicationUrl.Http201.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.post(`projects/${projectId}/applications/${applicationId}/sources/crawl-url`, {
				headers: await createAuthHeaders(),
				json: { url } satisfies API.CrawlGrantApplicationUrl.RequestBody,
			})
			.json<API.CrawlGrantApplicationUrl.Http201.ResponseBody>(),
	);
}

export async function crawlTemplateUrl(
	projectId: string,
	templateId: string,
	url: string,
): Promise<API.CrawlGrantTemplateUrl.Http201.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.post(`projects/${projectId}/grant_templates/${templateId}/sources/crawl-url`, {
				headers: await createAuthHeaders(),
				json: { url } satisfies API.CrawlGrantTemplateUrl.RequestBody,
			})
			.json<API.CrawlGrantTemplateUrl.Http201.ResponseBody>(),
	);
}

export async function createApplicationSourceUploadUrl(
	projectId: string,
	applicationId: string,
	fileName: string,
): Promise<API.CreateGrantApplicationRagSourceUploadUrl.Http201.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.post(`projects/${projectId}/applications/${applicationId}/sources/upload-url?blob_name=${fileName}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.CreateGrantApplicationRagSourceUploadUrl.Http201.ResponseBody>(),
	);
}

export async function createTemplateSourceUploadUrl(
	projectId: string,
	templateId: string,
	fileName: string,
): Promise<API.CreateGrantTemplateRagSourceUploadUrl.Http201.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.post(`projects/${projectId}/grant_templates/${templateId}/sources/upload-url?blob_name=${fileName}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.CreateGrantTemplateRagSourceUploadUrl.Http201.ResponseBody>(),
	);
}

export async function deleteApplicationSource(projectId: string, applicationId: string, sourceId: string) {
	await withAuthRedirect(
		getClient().delete(`projects/${projectId}/applications/${applicationId}/sources/${sourceId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function deleteTemplateSource(projectId: string, templateId: string, sourceId: string) {
	await withAuthRedirect(
		getClient().delete(`projects/${projectId}/grant_templates/${templateId}/sources/${sourceId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function getApplicationSources(projectId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`projects/${projectId}/applications/${applicationId}/sources`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RetrieveGrantApplicationRagSources.Http200.ResponseBody[]>(),
	);
}

export async function getTemplateSources(projectId: string, templateId: string) {
	return withAuthRedirect(
		getClient()
			.get(`projects/${projectId}/grant_templates/${templateId}/sources`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RetrieveGrantTemplateRagSources.Http200.ResponseBody[]>(),
	);
}