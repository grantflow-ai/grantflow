"use server";
import { getDatabaseClient } from "db/connection";
import { getEnv } from "@/utils/env";
import {
	ExecutiveSummaryGenerationResponse,
	InnovationAndSignificanceGenerationResponse,
	ResearchPlanGenerationResponse,
	SectionGenerationRequest,
} from "@/types/api-types";
import { generationResults } from "db/schema";
import { NewGenerationResult } from "@/types/database-types";
import { and, asc, eq } from "drizzle-orm";

const API_ROUTE = "/generate-section-text";

async function makeAPIRequest<T>(body: SectionGenerationRequest): Promise<T> {
	const url = new URL(API_ROUTE, getEnv().BACKEND_API_URL);

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(`Http request failed: ${response.statusText}`);
	}

	return (await response.json()) as T;
}

/**
 * Generate the significance and innovation text for an application.
 *
 * @param applicationId - The id of the application.
 * @param data - The request data.
 * @param sectionType - The type of section to generate.
 *
 * @returns an object containing the significance and innovation text.
 */
export async function generateSection<K extends "significance-and-innovation" | "research-plan" | "executive-summary">(
	applicationId: string,
	data: SectionGenerationRequest,
	sectionType: K,
): Promise<
	K extends "significance-and-innovation"
		? InnovationAndSignificanceGenerationResponse
		: K extends "research-plan"
			? ResearchPlanGenerationResponse
			: ExecutiveSummaryGenerationResponse
> {
	const db = getDatabaseClient();

	const response =
		await makeAPIRequest<
			K extends "significance-and-innovation"
				? InnovationAndSignificanceGenerationResponse
				: K extends "research-plan"
					? ResearchPlanGenerationResponse
					: ExecutiveSummaryGenerationResponse
		>(data);

	const results = await db
		.select({ version: generationResults.version })
		.from(generationResults)
		.orderBy(asc(generationResults.version))
		.where(and(eq(generationResults.applicationId, applicationId), eq(generationResults.type, sectionType)));

	const lastResult = results.at(-1);

	await db.insert(generationResults).values({
		applicationId,
		type: sectionType,
		data: response,
		version: lastResult ? lastResult.version + 1 : 1,
	} satisfies NewGenerationResult);

	return response;
}
