"use server";
import { getEnv } from "@/utils/env";
import { DraftGenerationRequest } from "@/types/api-types";

const API_ROUTE = "api/generate-draft";

/**
 * Generate the significance and innovation text for an application.
 * @param requestData - The request data for the draft generation.
 * @returns the ticket ID
 */
export async function generateApplicationDraft(requestData: DraftGenerationRequest): Promise<string> {
	const url = new URL(API_ROUTE, getEnv().BACKEND_API_BASE_URL);
	url.searchParams.append("code", getEnv().BACKEND_API_TOKEN);

	const response = await fetch(url.toString(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(requestData),
	});

	if (!response.ok) {
		throw new Error(`Http request failed: ${response.statusText}`);
	}

	const { ticket_id: ticketId } = (await response.json()) as { ticket_id: string };
	return ticketId;
}
