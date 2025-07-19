"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

/**
 * Delete a specific notification
 * @param notificationId - The ID of the notification to delete
 */
export async function deleteNotification(notificationId: string) {
	return withAuthRedirect(
		getClient()
			.delete(`notifications/${notificationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.DeleteNotification.Http200.ResponseBody>(),
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
			.json<API.GetNotifications.Http200.ResponseBody>(),
	);
}
