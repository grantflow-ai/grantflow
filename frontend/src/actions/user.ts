"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

/**
 * Delete the current user's account (soft delete)
 * This will mark the account for deletion with a grace period for restoration
 */
export async function deleteAccount() {
	return withAuthRedirect(
		getClient()
			.delete("user", {
				headers: await createAuthHeaders(),
			})
			.json<API.DeleteUser.Http200.ResponseBody>(),
	);
}

/**
 * Get list of projects where the user is the sole owner
 * These must be handled before account deletion
 */
export async function getSoleOwnedProjects() {
	return withAuthRedirect(
		getClient()
			.get("user/sole-owned-projects", {
				headers: await createAuthHeaders(),
			})
			.json<API.GetSoleOwnedProjects.Http200.ResponseBody>(),
	);
}

/**
 * Restore a soft-deleted account within the grace period
 * @param token - Restoration token sent via email
 */
export async function restoreAccount(token: string) {
	// NOTE: Backend endpoint not yet implemented
	return withAuthRedirect(
		getClient()
			.post("user/restore", {
				headers: await createAuthHeaders(),
				json: { token },
			})
			.json<{ message: string; success: boolean }>(),
	);
}
