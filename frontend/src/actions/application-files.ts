import { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function createUploadUrl(
	workspaceId: string,
	applicationId: string,
	fileName: string,
): Promise<API.CreateGrantApplicationRagSourceUploadUrl.Http201.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/applications/${applicationId}/files/upload-url?blob_name=${fileName}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.CreateGrantApplicationRagSourceUploadUrl.Http201.ResponseBody>(),
	);
}

export async function deleteApplicationFile(workspaceId: string, applicationId: string, fileId: string) {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/applications/${applicationId}/files/${fileId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function getApplicationFiles(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}/files`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RetrieveGrantApplicationRagSources.Http200.ResponseBody[]>(),
	);
}
