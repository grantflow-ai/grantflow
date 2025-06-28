import { create } from "zustand";

import type { NotificationData } from "@/components/app/feedback/notification-banner";

interface NotificationActions {
	addNotification: (notification: Omit<NotificationData, "id">) => void;
	clearAllNotifications: () => void;
	removeNotification: (id: string) => void;
}

interface NotificationState {
	notifications: NotificationData[];
}

const initialState: NotificationState = {
	notifications: [],
};

let notificationIdCounter = 0;

export const useNotificationStore = create<NotificationActions & NotificationState>((set) => ({
	...initialState,

	addNotification: (notification) => {
		const id = `notification-${++notificationIdCounter}`;
		const newNotification: NotificationData = { ...notification, id };

		set((state) => ({
			notifications: [...state.notifications, newNotification],
		}));
	},

	clearAllNotifications: () => {
		set({ notifications: [] });
	},

	removeNotification: (id) => {
		set((state) => ({
			notifications: state.notifications.filter((notification) => notification.id !== id),
		}));
	},
}));
