"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";
import { createTraceHeaders, generateTraceId, logTraceEvent } from "@/utils/tracing";

export async function generateGrantTemplate(
	projectId: string,
	applicationId: string,
	templateId: string,
): Promise<string> {
	const traceId = generateTraceId();
	const operation = "grant_template_generation";

	logTraceEvent(traceId, operation, "action_start", {
		application_id: applicationId,
		initiated_by: "user_action",
		project_id: projectId,
		template_id: templateId,
	});

	try {
		await withAuthRedirect(
			getClient().post(`projects/${projectId}/applications/${applicationId}/grant-template/${templateId}`, {
				headers: {
					...(await createAuthHeaders()),
					...createTraceHeaders(traceId, operation),
				},
			}),
		);

		logTraceEvent(traceId, operation, "action_success");

		return traceId;
	} catch (error) {
		logTraceEvent(traceId, operation, "action_failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

export async function updateGrantTemplate(
	projectId: string,
	applicationId: string,
	templateId: string,
	data: Partial<API.UpdateGrantTemplate.RequestBody>,
): Promise<void> {
	await withAuthRedirect(
		getClient().patch(`projects/${projectId}/applications/${applicationId}/grant-template/${templateId}`, {
			headers: await createAuthHeaders(),
			json: data,
		}),
	);
}
