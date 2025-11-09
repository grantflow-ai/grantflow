"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api/server";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export interface ListPredefinedTemplatesFilters {
	activityCode?: string;
	grantingInstitutionId?: string;
}

export async function createPredefinedTemplate(data: API.CreatePredefinedGrantTemplate.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post("/predefined-templates", {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.CreatePredefinedGrantTemplate.Http201.ResponseBody>(),
	);
}

export async function deletePredefinedTemplate(templateId: string) {
	return withAuthRedirect(
		getClient()
			.delete(`/predefined-templates/${templateId}`, {
				headers: await createAuthHeaders(),
			})
			.json<void>(),
	);
}

export async function getPredefinedTemplate(templateId: string) {
	return withAuthRedirect(
		getClient()
			.get(`/predefined-templates/${templateId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.GetPredefinedGrantTemplate.Http200.ResponseBody>(),
	);
}

export async function listPredefinedTemplates(filters: ListPredefinedTemplatesFilters = {}) {
	const params = new URLSearchParams();

	if (filters.grantingInstitutionId) {
		params.set("granting_institution_id", filters.grantingInstitutionId);
	}

	if (filters.activityCode) {
		params.set("activity_code", filters.activityCode);
	}

	const query = params.toString();
	const path = query ? `/predefined-templates?${query}` : "/predefined-templates";

	return withAuthRedirect(
		getClient()
			.get(path, {
				headers: await createAuthHeaders(),
			})
			.json<API.ListPredefinedGrantTemplates.Http200.ResponseBody>(),
	);
}

export async function updatePredefinedTemplate(
	templateId: string,
	data: API.UpdatePredefinedGrantTemplate.RequestBody,
) {
	return withAuthRedirect(
		getClient()
			.patch(`/predefined-templates/${templateId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdatePredefinedGrantTemplate.Http200.ResponseBody>(),
	);
}
