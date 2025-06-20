"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function generateGrantTemplate(
	workspaceId: string,
	applicationId: string,
	templateId: string,
): Promise<void> {
	await withAuthRedirect(
		getClient().post(`workspaces/${workspaceId}/applications/${applicationId}/grant-template/${templateId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function updateGrantTemplate(
	workspaceId: string,
	applicationId: string,
	templateId: string,
	data: Partial<API.UpdateGrantTemplate.RequestBody>,
): Promise<void> {
	await withAuthRedirect(
		getClient().patch(`workspaces/${workspaceId}/applications/${applicationId}/grant-template/${templateId}`, {
			headers: await createAuthHeaders(),
			json: data,
		}),
	);
}
