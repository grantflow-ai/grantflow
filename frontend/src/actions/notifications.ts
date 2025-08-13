"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api/server";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

/**
 * Dismiss a specific notification
 * @param notificationId - The ID of the notification to dismiss
 */
export async function dismissNotification(notificationId: string) {
	return withAuthRedirect(
		getClient()
			.delete(`notifications/${notificationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.DismissNotification.Http200.ResponseBody>(),
	);
}

/**
 * Get all notifications for the current user
 */
export async function getNotifications() {
	return withAuthRedirect(
		getClient()
			.get("notifications", {
				headers: await createAuthHeaders(),
			})
			.json<API.ListNotifications.Http200.ResponseBody>(),
	);
}
