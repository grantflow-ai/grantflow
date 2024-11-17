"use server";
import { getDatabaseClient } from "db/connection";
import { getEnv } from "@/utils/env";
import { generationResults } from "db/schema";
import { NewGenerationResult } from "@/types/database-types";
import { DraftGenerationRequest } from "@/types/api-types";

const API_ROUTE = "generate-draft";

async function makeAPIRequest(body: DraftGenerationRequest): Promise<string> {
	const url = new URL(API_ROUTE, getEnv().BACKEND_API_BASE_URL);
	url.searchParams.append("code", getEnv().BACKEND_API_TOKEN);

	const response = await fetch(url.toString(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(`Http request failed: ${response.statusText}`);
	}

	const { result } = (await response.json()) as { result: string };
	return result;
}

/**
 * Generate the significance and innovation text for an application.
 *
 * @param requestData - The request requestData.
 *
 * @returns an object containing the significance and innovation text.
 */
export async function generateApplicationDraft(requestData: DraftGenerationRequest): Promise<string> {
	const db = getDatabaseClient();

	const text = await makeAPIRequest(requestData);

	await db.insert(generationResults).values({
		applicationId: requestData.application_id,
		text,
	} satisfies NewGenerationResult);

	return text;
}
