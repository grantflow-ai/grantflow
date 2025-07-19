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
			.json<API.CreateGrantingInstitution.Http201.ResponseBody>(),
	);
}

export async function deleteGrantingInstitution(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.delete(`granting-institutions/${organizationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.DeleteGrantingInstitution.Http204.ResponseBody>(),
	);
}

export async function getGrantingInstitutions() {
	return withAuthRedirect(
		getClient()
			.get("granting-institutions", {
				headers: await createAuthHeaders(),
			})
			.json<API.ListGrantingInstitutions.Http200.ResponseBody>(),
	);
}

export async function updateGrantingInstitution(
	organizationId: string,
	data: API.UpdateGrantingInstitution.RequestBody,
) {
	return withAuthRedirect(
		getClient()
			.patch(`granting-institutions/${organizationId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateGrantingInstitution.Http200.ResponseBody>(),
	);
}
