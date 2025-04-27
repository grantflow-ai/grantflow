import { API } from "@/types/api-types";
import { createAuthHeaders, getClient, withAuthRedirect } from "@/utils/api";

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
			.json<API.ListApplicationFiles.Http200.ResponseBody[]>(),
	);
}
