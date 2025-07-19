"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function createGrantingInstitution(data: API.CreateGrantingInstitution.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post("granting-institutions", {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.CreateGrantingInstitution.ResponseBody>(),
	);
}

export async function deleteGrantingInstitution(institutionId: string) {
	return withAuthRedirect(
		getClient()
			.delete(`granting-institutions/${institutionId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.DeleteGrantingInstitution.ResponseBody>(),
	);
}

// Global Granting Institutions Management (Admin only)
export async function getGrantingInstitutions() {
	return withAuthRedirect(
		getClient()
			.get("granting-institutions", {
				headers: await createAuthHeaders(),
			})
			.json<API.ListGrantingInstitutions.ResponseBody>(),
	);
}

export async function updateGrantingInstitution(
	institutionId: string,
	data: API.UpdateGrantingInstitution.RequestBody,
) {
	return withAuthRedirect(
		getClient()
			.patch(`granting-institutions/${institutionId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateGrantingInstitution.ResponseBody>(),
	);
}
