"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function createProject(data: API.CreateProject.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post("projects", { headers: await createAuthHeaders(), json: data })
			.json<API.CreateProject.Http201.ResponseBody>(),
	);
}

export async function deleteProject(projectId: string) {
	await withAuthRedirect(getClient().delete(`projects/${projectId}`, { headers: await createAuthHeaders() }));
}

export async function getProject(projectId: string) {
	return withAuthRedirect(
		getClient()
			.get(`projects/${projectId}`, { headers: await createAuthHeaders() })
			.json<API.GetProject.Http200.ResponseBody>(),
	);
}

export async function getProjects() {
	return withAuthRedirect(
		getClient()
			.get("projects", { headers: await createAuthHeaders() })
			.json<API.ListProjects.Http200.ResponseBody>(),
	);
}

export async function updateProject(projectId: string, data: API.UpdateProject.RequestBody) {
	return withAuthRedirect(
		getClient()
			.patch(`projects/${projectId}`, { headers: await createAuthHeaders(), json: data })
			.json<API.UpdateProject.Http200.ResponseBody>(),
	);
}
