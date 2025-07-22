import { DismissNotificationResponseFactory, ListNotificationsResponseFactory } from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";
import { dismissNotification, getNotifications } from "./notifications";

// Mock the dependencies
vi.mock("@/utils/api");
vi.mock("@/utils/server-side");

const mockGetClient = vi.mocked(getClient);
const mockCreateAuthHeaders = vi.mocked(createAuthHeaders);
const mockWithAuthRedirect = vi.mocked(withAuthRedirect);

describe("Notifications Actions", () => {
	const mockAuthHeaders = { Authorization: "Bearer token" };
	let mockClient: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockClient = {
			delete: vi.fn(),
			get: vi.fn(),
		};
		mockGetClient.mockReturnValue(mockClient);
		mockCreateAuthHeaders.mockResolvedValue(mockAuthHeaders);
		mockWithAuthRedirect.mockImplementation((promise) => promise);
	});

	describe("dismissNotification", () => {
		it("should dismiss notification with correct parameters", async () => {
			const notificationId = "notification-123";
			const responseData = DismissNotificationResponseFactory.build({
				notification_id: notificationId,
			});

			mockClient.delete.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await dismissNotification(notificationId);

			expect(mockClient.delete).toHaveBeenCalledWith(`notifications/${notificationId}`, {
				headers: mockAuthHeaders,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const notificationId = "notification-123";
			mockClient.delete.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(dismissNotification(notificationId)).rejects.toThrow("API Error");
		});
	});

	describe("getNotifications", () => {
		it("should get notifications with correct parameters", async () => {
			const responseData = ListNotificationsResponseFactory.build();

			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await getNotifications();

			expect(mockClient.get).toHaveBeenCalledWith("notifications", {
				headers: mockAuthHeaders,
			});
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(getNotifications()).rejects.toThrow("API Error");
		});
	});

	describe("integration with auth utilities", () => {
		it("should wrap all API calls with withAuthRedirect", async () => {
			mockClient.get.mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
			mockClient.delete.mockReturnValue({ json: vi.fn().mockResolvedValue({}) });

			await getNotifications();
			await dismissNotification("test-id");

			expect(mockWithAuthRedirect).toHaveBeenCalledTimes(2);
		});

		it("should call createAuthHeaders for all functions", async () => {
			mockClient.get.mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
			mockClient.delete.mockReturnValue({ json: vi.fn().mockResolvedValue({}) });

			await getNotifications();
			await dismissNotification("test-id");

			expect(mockCreateAuthHeaders).toHaveBeenCalledTimes(2);
		});
	});
});
