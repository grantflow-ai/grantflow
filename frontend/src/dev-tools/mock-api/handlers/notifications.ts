import type { API } from "@/types/api-types";
import { log } from "@/utils/logger";

type Notification = API.ListNotifications.Http200.ResponseBody["notifications"][0];

const mockNotifications: Notification[] = [
	{
		created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
		dismissed: false,
		id: "notif-1",
		message: "Your application for NSF Grant has been submitted successfully",
		project_id: "proj-1",
		project_name: "Sample Project",
		read: false,
		title: "Application Submitted",
		type: "application_submitted",
	},
	{
		created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
		dismissed: false,
		extra_data: {
			document_name: "grant_guidelines.pdf",
			pages: 45,
		},
		id: "notif-2",
		message: "grant_guidelines.pdf has been processed and is ready for use",
		project_id: "proj-1",
		project_name: "Sample Project",
		read: true,
		title: "Document Processed",
		type: "document_processed",
	},
	{
		created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
		dismissed: false,
		expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(), // expires in 6 days
		id: "notif-3",
		message: "Invitation sent to john.doe@example.com",
		read: false,
		title: "Team Invitation Sent",
		type: "invitation_sent",
	},
];

let notifications = [...mockNotifications];

export const notificationHandlers = {
	dismissNotification: async ({
		params,
	}: {
		params?: Record<string, string>;
	}): Promise<API.DismissNotification.Http200.ResponseBody> => {
		const notification_id = params?.notification_id;
		if (!notification_id) {
			throw new Error("Notification ID is required");
		}
		log.info("[Mock API] Dismissing notification", { notification_id });

		const notification = notifications.find((n) => n.id === notification_id);
		if (!notification) {
			throw new Error("Notification not found");
		}

		notification.dismissed = true;

		return {
			notification_id,
			success: true,
		};
	},
	listNotifications: async ({
		query,
	}: {
		query?: URLSearchParams;
	}): Promise<API.ListNotifications.Http200.ResponseBody> => {
		const includeRead = query?.get("include_read") === "true";
		log.info("[Mock API] Listing notifications", { includeRead });

		const activeNotifications = notifications.filter((n) => {
			if (!includeRead && n.read) return false;
			return !(n.expires_at && new Date(n.expires_at) < new Date());
		});

		return {
			notifications: activeNotifications,
			total: activeNotifications.length,
		};
	},
};

export function addNotification(
	notification: Partial<Notification> & Pick<Notification, "message" | "title" | "type">,
): void {
	const newNotification: Notification = {
		created_at: new Date().toISOString(),
		dismissed: false,
		id: `notif-${Date.now()}`,
		read: false,
		...notification,
	};
	notifications.push(newNotification);
}

export function clearNotifications(): void {
	notifications = [...mockNotifications];
}

export function markNotificationAsRead(notificationId: string): void {
	const notification = notifications.find((n) => n.id === notificationId);
	if (notification) {
		notification.read = true;
	}
}
