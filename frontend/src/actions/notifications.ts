"use server";

import type { API } from "@/types";
import { getClient } from "@/utils/api/server";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function dismissNotification(notificationId: string) {
	return withAuthRedirect(
		getClient()
			.delete(`notifications/${notificationId}`, {
				headers: await createAuthHeaders(),
			})
			.json<API.DismissNotification.Http200.ResponseBody>(),
	);
}

export async function getNotifications() {
	return withAuthRedirect(
		getClient()
			.get("notifications", {
				headers: await createAuthHeaders(),
			})
			.json<API.ListNotifications.Http200.ResponseBody>(),
	);
}
