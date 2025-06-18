import { renderHook, waitFor } from "@testing-library/react";
import { ReadyState } from "react-use-websocket";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SourceProcessingNotificationMessageFactory } from "::testing/factories";
import { getOtp } from "@/actions/otp";
import { getEnv } from "@/utils/env";

vi.mock("@/actions/otp");
vi.mock("@/utils/env");
vi.mock("react-use-websocket");

const mockGetOtp = vi.mocked(getOtp);
const mockGetEnv = vi.mocked(getEnv);

describe("useApplicationNotifications", () => {
	const mockSendMessage = vi.fn();
	const mockUseWebSocket = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		mockGetEnv.mockReturnValue({
			NEXT_PUBLIC_BACKEND_API_BASE_URL: "http://localhost:8000",
		} as any);

		mockGetOtp.mockResolvedValue({ otp: "test-otp-token" });

		mockUseWebSocket.mockReturnValue({
			lastJsonMessage: null,
			readyState: ReadyState.CONNECTING,
			sendMessage: mockSendMessage,
		});

		vi.doMock("react-use-websocket", () => ({
			default: mockUseWebSocket,
			ReadyState,
		}));
	});

	afterEach(() => {
		vi.resetModules();
	});

	it("should not connect when workspaceId or applicationId is missing", async () => {
		const { useApplicationNotifications } = await import("./use-application-notifications");

		renderHook(() =>
			useApplicationNotifications({
				applicationId: "app-123",
				workspaceId: undefined,
			}),
		);

		expect(mockUseWebSocket).toHaveBeenCalledWith(null);
	});

	it("should connect with proper URL when both IDs are provided", async () => {
		const { useApplicationNotifications } = await import("./use-application-notifications");

		renderHook(() =>
			useApplicationNotifications({
				applicationId: "app-123",
				workspaceId: "workspace-123",
			}),
		);

		await waitFor(() => {
			expect(mockUseWebSocket).toHaveBeenCalledWith(expect.any(Function));
		});

		const [[getSocketUrl]] = mockUseWebSocket.mock.calls;
		const url = await getSocketUrl();

		expect(url).toBe(
			"ws://localhost:8000/workspaces/workspace-123/applications/app-123/notifications?otp=test-otp-token",
		);
	});

	it("should accumulate notifications", async () => {
		const { useApplicationNotifications } = await import("./use-application-notifications");

		const firstNotification = SourceProcessingNotificationMessageFactory.build({
			data: {
				identifier: "doc1.pdf",
				indexing_status: "FINISHED",
				parent_id: "app-123",
				parent_type: "grant_application",
				rag_source_id: "source-1",
			},
			parent_id: "app-123",
		});

		mockUseWebSocket.mockReturnValue({
			lastJsonMessage: firstNotification,
			readyState: ReadyState.OPEN,
			sendMessage: mockSendMessage,
		});

		const { rerender, result } = renderHook(() =>
			useApplicationNotifications({
				applicationId: "app-123",
				workspaceId: "workspace-123",
			}),
		);

		expect(result.current.notifications).toHaveLength(1);
		expect(result.current.notifications[0]).toEqual(firstNotification);

		const secondNotification = SourceProcessingNotificationMessageFactory.build({
			data: {
				identifier: "doc2.pdf",
				indexing_status: "INDEXING",
				parent_id: "app-123",
				parent_type: "grant_application",
				rag_source_id: "source-2",
			},
			parent_id: "app-123",
		});

		mockUseWebSocket.mockReturnValue({
			lastJsonMessage: secondNotification,
			readyState: ReadyState.OPEN,
			sendMessage: mockSendMessage,
		});

		rerender();

		await waitFor(() => {
			expect(result.current.notifications).toHaveLength(2);
		});

		expect(result.current.notifications[1]).toEqual(secondNotification);
	});

	it("should return correct connection status and color", async () => {
		const { useApplicationNotifications } = await import("./use-application-notifications");

		mockUseWebSocket.mockReturnValue({
			lastJsonMessage: null,
			readyState: ReadyState.OPEN,
			sendMessage: mockSendMessage,
		});

		const { result } = renderHook(() =>
			useApplicationNotifications({
				applicationId: "app-123",
				workspaceId: "workspace-123",
			}),
		);

		expect(result.current.connectionStatus).toBe("Open");
		expect(result.current.connectionStatusColor).toBe("bg-green-500");
	});

	it("should expose sendMessage function", async () => {
		const { useApplicationNotifications } = await import("./use-application-notifications");

		const { result } = renderHook(() =>
			useApplicationNotifications({
				applicationId: "app-123",
				workspaceId: "workspace-123",
			}),
		);

		result.current.sendMessage("Test message");
		expect(mockSendMessage).toHaveBeenCalledWith("Test message");
	});
});

describe("Type Guards", () => {
	it("isSourceProcessingNotificationMessage should correctly identify source notifications", async () => {
		const { isSourceProcessingNotificationMessage } = await import("./use-application-notifications");
		const { SourceIndexingStatus } = await import("@/enums");

		const validNotification = {
			type: "data",
			event: "source_processing",
			parent_id: "test-id",
			data: {
				identifier: "test.pdf",
				indexing_status: SourceIndexingStatus.INDEXING,
				parent_id: "test-id",
				parent_type: "grant_template",
				rag_source_id: "source-1",
			},
		};

		expect(isSourceProcessingNotificationMessage(validNotification)).toBe(true);

		const invalidNotification = {
			type: "data",
			event: "other_event",
			parent_id: "test-id",
			data: {
				message: "Some other message",
			},
		};

		expect(isSourceProcessingNotificationMessage(invalidNotification)).toBe(false);
	});

	it("isRagProcessingStatusMessage should correctly identify RAG status messages", async () => {
		const { isRagProcessingStatusMessage } = await import("./use-application-notifications");

		const validNotification = {
			type: "data",
			event: "grant_template_extraction",
			parent_id: "test-id",
			data: {
				event: "grant_template_extraction",
				message: "Extracting sections...",
				data: { section_count: 5 },
			},
		};

		expect(isRagProcessingStatusMessage(validNotification)).toBe(true);

		const validNotificationWithoutData = {
			type: "data",
			event: "grant_template_extraction",
			parent_id: "test-id",
			data: {
				event: "grant_template_extraction",
				message: "Processing...",
			},
		};

		expect(isRagProcessingStatusMessage(validNotificationWithoutData)).toBe(true);

		const invalidNotification = {
			type: "data",
			event: "source_processing",
			parent_id: "test-id",
			data: {
				identifier: "test.pdf",
			},
		};

		expect(isRagProcessingStatusMessage(invalidNotification)).toBe(false);
	});
});
