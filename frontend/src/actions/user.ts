"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api/server";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function deleteAccount() {
	return withAuthRedirect(
		getClient()
			.delete("user", {
				headers: await createAuthHeaders(),
			})
			.json<API.DeleteUser.Http200.ResponseBody>(),
	);
}

export async function getSoleOwnedOrganizations() {
	return withAuthRedirect(
		getClient()
			.get("user/sole-owned-organizations", {
				headers: await createAuthHeaders(),
			})
			.json<API.GetSoleOwnedOrganizations.Http200.ResponseBody>(),
	);
}

export async function getSoleOwnedProjects() {
	return withAuthRedirect(
		getClient()
			.get("user/sole-owned-projects", {
				headers: await createAuthHeaders(),
			})
			.json<API.GetSoleOwnedProjects.Http200.ResponseBody>(),
	);
}

export async function restoreAccount(token: string) {
	return withAuthRedirect(
		getClient()
			.post("user/restore", {
				headers: await createAuthHeaders(),
				json: { token },
			})
			.json<{ message: string; success: boolean }>(),
	);
}
