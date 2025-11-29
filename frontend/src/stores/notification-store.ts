import { create } from "zustand";

export interface NotificationData {
	id: string;
	message: string;
	projectName: string;
	title: string;
	type?: "deadline" | "error" | "info" | "success" | "warning" | undefined;
}

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
