import { act, renderHook } from "@testing-library/react";

import { useNotificationStore } from "./notification-store";

const mockNotification = {
	message: "Test notification message",
	title: "Test Title",
	type: "success" as const,
};

const mockErrorNotification = {
	message: "Error occurred",
	title: "Error",
	type: "error" as const,
};

describe("useNotificationStore", () => {
	beforeEach(() => {
		// Reset store state before each test
		act(() => {
			useNotificationStore.getState().clearAllNotifications();
		});
	});

	it("has correct initial state", () => {
		const { result } = renderHook(() => useNotificationStore());

		expect(result.current.notifications).toEqual([]);
	});

	it("adds a notification with generated id", () => {
		const { result } = renderHook(() => useNotificationStore());

		act(() => {
			result.current.addNotification(mockNotification);
		});

		expect(result.current.notifications).toHaveLength(1);
		expect(result.current.notifications[0]).toEqual({
			...mockNotification,
			id: expect.stringMatching(/^notification-\d+$/),
		});
	});

	it("adds multiple notifications with unique ids", () => {
		const { result } = renderHook(() => useNotificationStore());

		act(() => {
			result.current.addNotification(mockNotification);
			result.current.addNotification(mockErrorNotification);
		});

		expect(result.current.notifications).toHaveLength(2);
		expect(result.current.notifications[0].id).not.toBe(result.current.notifications[1].id);
		expect(result.current.notifications[0].message).toBe(mockNotification.message);
		expect(result.current.notifications[1].message).toBe(mockErrorNotification.message);
	});

	it("removes specific notification by id", () => {
		const { result } = renderHook(() => useNotificationStore());

		// Add two notifications
		act(() => {
			result.current.addNotification(mockNotification);
			result.current.addNotification(mockErrorNotification);
		});

		expect(result.current.notifications).toHaveLength(2);

		const firstNotificationId = result.current.notifications[0].id;

		// Remove first notification
		act(() => {
			result.current.removeNotification(firstNotificationId);
		});

		expect(result.current.notifications).toHaveLength(1);
		expect(result.current.notifications[0].message).toBe(mockErrorNotification.message);
	});

	it("does nothing when removing non-existent notification", () => {
		const { result } = renderHook(() => useNotificationStore());

		// Add one notification
		act(() => {
			result.current.addNotification(mockNotification);
		});

		expect(result.current.notifications).toHaveLength(1);

		// Try to remove non-existent notification
		act(() => {
			result.current.removeNotification("non-existent-id");
		});

		expect(result.current.notifications).toHaveLength(1);
		expect(result.current.notifications[0].message).toBe(mockNotification.message);
	});

	it("clears all notifications", () => {
		const { result } = renderHook(() => useNotificationStore());

		// Add multiple notifications
		act(() => {
			result.current.addNotification(mockNotification);
			result.current.addNotification(mockErrorNotification);
			result.current.addNotification({ ...mockNotification, message: "Third notification" });
		});

		expect(result.current.notifications).toHaveLength(3);

		// Clear all
		act(() => {
			result.current.clearAllNotifications();
		});

		expect(result.current.notifications).toEqual([]);
	});

	it("handles notifications with different types", () => {
		const { result } = renderHook(() => useNotificationStore());

		const infoNotification = {
			message: "Info message",
			type: "info" as const,
		};

		const warningNotification = {
			message: "Warning message",
			title: "Warning",
			type: "warning" as const,
		};

		act(() => {
			result.current.addNotification(mockNotification); // success
			result.current.addNotification(mockErrorNotification); // error
			result.current.addNotification(infoNotification); // info
			result.current.addNotification(warningNotification); // warning
		});

		expect(result.current.notifications).toHaveLength(4);
		expect(result.current.notifications[0].type).toBe("success");
		expect(result.current.notifications[1].type).toBe("error");
		expect(result.current.notifications[2].type).toBe("info");
		expect(result.current.notifications[3].type).toBe("warning");
	});

	it("handles notifications without optional fields", () => {
		const { result } = renderHook(() => useNotificationStore());

		const minimalNotification = {
			message: "Minimal notification",
			type: "info" as const,
		};

		act(() => {
			result.current.addNotification(minimalNotification);
		});

		expect(result.current.notifications).toHaveLength(1);
		expect(result.current.notifications[0]).toEqual({
			...minimalNotification,
			id: expect.stringMatching(/^notification-\d+$/),
		});
	});

	it("maintains notification order (FIFO)", () => {
		const { result } = renderHook(() => useNotificationStore());

		const firstNotification = { ...mockNotification, message: "First" };
		const secondNotification = { ...mockNotification, message: "Second" };
		const thirdNotification = { ...mockNotification, message: "Third" };

		act(() => {
			result.current.addNotification(firstNotification);
			result.current.addNotification(secondNotification);
			result.current.addNotification(thirdNotification);
		});

		expect(result.current.notifications[0].message).toBe("First");
		expect(result.current.notifications[1].message).toBe("Second");
		expect(result.current.notifications[2].message).toBe("Third");
	});

	it("generates incrementing ids", () => {
		const { result } = renderHook(() => useNotificationStore());

		act(() => {
			result.current.addNotification(mockNotification);
		});

		const firstId = result.current.notifications[0].id;

		act(() => {
			result.current.addNotification(mockNotification);
		});

		const secondId = result.current.notifications[1].id;

		// Extract numbers from ids
		const firstNum = Number.parseInt(firstId.replace("notification-", ""));
		const secondNum = Number.parseInt(secondId.replace("notification-", ""));

		expect(secondNum).toBeGreaterThan(firstNum);
	});

	it("can perform complex notification management scenarios", () => {
		const { result } = renderHook(() => useNotificationStore());

		// Add multiple notifications
		act(() => {
			result.current.addNotification({ ...mockNotification, message: "First" });
			result.current.addNotification({ ...mockNotification, message: "Second" });
			result.current.addNotification({ ...mockNotification, message: "Third" });
		});

		expect(result.current.notifications).toHaveLength(3);

		// Remove middle notification
		const secondId = result.current.notifications[1].id;
		act(() => {
			result.current.removeNotification(secondId);
		});

		expect(result.current.notifications).toHaveLength(2);
		expect(result.current.notifications[0].message).toBe("First");
		expect(result.current.notifications[1].message).toBe("Third");

		// Add new notification
		act(() => {
			result.current.addNotification({ ...mockNotification, message: "Fourth" });
		});

		expect(result.current.notifications).toHaveLength(3);
		expect(result.current.notifications[2].message).toBe("Fourth");

		// Clear all
		act(() => {
			result.current.clearAllNotifications();
		});

		expect(result.current.notifications).toEqual([]);
	});
});