import { describe, expect, it, vi } from "vitest";
import * as notificationActions from "@/actions/notifications";

vi.mock("@/actions/notifications");

describe("Notifications API Actions", () => {
	const mockNotificationId = "123e4567-e89b-12d3-a456-426614174000";

	describe("Notification Management", () => {
		it("should get all notifications", async () => {
			const expectedResponse = {
				notifications: [
					{
						created_at: "2023-01-01T00:00:00Z",
						dismissed: false,
						id: mockNotificationId,
						message: "Your grant application has been updated",
						read: false,
						title: "Application Updated",
						type: "application_update",
					},
				],
				total: 1,
			};
			vi.mocked(notificationActions.getNotifications).mockResolvedValue(expectedResponse);

			const result = await notificationActions.getNotifications();

			expect(notificationActions.getNotifications).toHaveBeenCalled();
			expect(result).toEqual(expectedResponse);
		});

		it("should dismiss notification", async () => {
			const expectedResponse = { notification_id: mockNotificationId, success: true };
			vi.mocked(notificationActions.dismissNotification).mockResolvedValue(expectedResponse);

			const result = await notificationActions.dismissNotification(mockNotificationId);

			expect(notificationActions.dismissNotification).toHaveBeenCalledWith(mockNotificationId);
			expect(result).toEqual(expectedResponse);
		});
	});
});
