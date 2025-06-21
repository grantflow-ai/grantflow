"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function createWorkspace(data: API.CreateWorkspace.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post("workspaces", { headers: await createAuthHeaders(), json: data })
			.json<API.CreateWorkspace.Http201.ResponseBody>(),
	);
}

export async function deleteWorkspace(workspaceId: string) {
	await withAuthRedirect(getClient().delete(`workspaces/${workspaceId}`, { headers: await createAuthHeaders() }));
}

export async function getWorkspace(workspaceId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}`, { headers: await createAuthHeaders() })
			.json<API.GetWorkspace.Http200.ResponseBody>(),
	);
}

export async function getWorkspaces() {
	return withAuthRedirect(
		getClient()
			.get("workspaces", { headers: await createAuthHeaders() })
			.json<API.ListWorkspaces.Http200.ResponseBody>(),
	);
}

export async function updateWorkspace(workspaceId: string, data: API.UpdateWorkspace.RequestBody) {
	return withAuthRedirect(
		getClient()
			.patch(`workspaces/${workspaceId}`, { headers: await createAuthHeaders(), json: data })
			.json<API.UpdateWorkspace.Http200.ResponseBody>(),
	);
}
