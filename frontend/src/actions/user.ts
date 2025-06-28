"use server";

import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

/**
 * Delete the current user's account (soft delete)
 * This will mark the account for deletion with a grace period for restoration
 */
export async function deleteAccount() {
	// NOTE: Replace with actual API endpoint when backend is implemented
	
	return withAuthRedirect(
		getClient()
			.delete("user/account", {
				headers: await createAuthHeaders(),
			})
			.json<{ message: string; success: boolean }>(),
	);
}

/**
 * Restore a soft-deleted account within the grace period
 * @param token - Restoration token sent via email
 */
export async function restoreAccount(token: string) {
	// NOTE: Replace with actual API endpoint when backend is implemented
	return withAuthRedirect(
		getClient()
			.post("user/account/restore", {
				headers: await createAuthHeaders(),
				json: { token },
			})
			.json<{ message: string; success: boolean }>(),
	);
}
