import { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function createApplicationSourceUploadUrl(
	workspaceId: string,
	applicationId: string,
	fileName: string,
): Promise<API.CreateGrantApplicationRagSourceUploadUrl.Http201.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/applications/${applicationId}/sources/upload-url?blob_name=${fileName}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.CreateGrantApplicationRagSourceUploadUrl.Http201.ResponseBody>(),
	);
}

export async function createTemplateSourceUploadUrl(
	workspaceId: string,
	templateId: string,
	fileName: string,
): Promise<API.CreateGrantTemplateRagSourceUploadUrl.Http201.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/grant_templates/${templateId}/sources/upload-url?blob_name=${fileName}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.CreateGrantTemplateRagSourceUploadUrl.Http201.ResponseBody>(),
	);
}

export async function deleteApplicationSource(workspaceId: string, applicationId: string, sourceId: string) {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/applications/${applicationId}/sources/${sourceId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function deleteTemplateSource(workspaceId: string, templateId: string, sourceId: string) {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/grant_templates/${templateId}/sources/${sourceId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function getApplicationSources(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}/sources`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RetrieveGrantApplicationRagSources.Http200.ResponseBody[]>(),
	);
}

export async function getTemplateSources(workspaceId: string, templateId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/grant_templates/${templateId}/sources`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RetrieveGrantTemplateRagSources.Http200.ResponseBody[]>(),
	);
}
