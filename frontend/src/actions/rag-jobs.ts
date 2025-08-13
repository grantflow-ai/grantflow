"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api/server";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function retrieveRagJob(
	organizationId: string,
	projectId: string,
	jobId: string,
): Promise<API.RetrieveRagJob.Http200.ResponseBody> {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}/projects/${projectId}/rag-jobs/${jobId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.RetrieveRagJob.Http200.ResponseBody>(),
	);
}
