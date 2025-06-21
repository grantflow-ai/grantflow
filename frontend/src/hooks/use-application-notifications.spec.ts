import { RagProcessingStatusMessageFactory, SourceProcessingNotificationMessageFactory } from "::testing/factories";
import { renderHook, waitFor } from "@testing-library/react";
import { ReadyState } from "react-use-websocket";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

		expect(mockUseWebSocket).toHaveBeenCalledWith(null, expect.any(Object));
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
			expect(mockUseWebSocket).toHaveBeenCalledWith(expect.any(Function), expect.any(Object));
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

	it("should configure auto-reconnection with exponential backoff", async () => {
		const { useApplicationNotifications } = await import("./use-application-notifications");

		renderHook(() =>
			useApplicationNotifications({
				applicationId: "app-123",
				workspaceId: "workspace-123",
			}),
		);

		await waitFor(() => {
			expect(mockUseWebSocket).toHaveBeenCalled();
		});

		const [[, options]] = mockUseWebSocket.mock.calls;

		expect(options.shouldReconnect({ code: 1000 })).toBe(false);
		expect(options.shouldReconnect({ code: 1006 })).toBe(true);

		expect(options.reconnectInterval(0)).toBe(1000);
		expect(options.reconnectInterval(1)).toBe(2000);
		expect(options.reconnectInterval(2)).toBe(4000);
		expect(options.reconnectInterval(3)).toBe(8000);
		expect(options.reconnectInterval(4)).toBe(16_000);
		expect(options.reconnectInterval(5)).toBe(30_000);
		expect(options.reconnectInterval(10)).toBe(30_000);
	});

	it("should stop reconnecting after max attempts", async () => {
		const { useApplicationNotifications } = await import("./use-application-notifications");

		renderHook(() =>
			useApplicationNotifications({
				applicationId: "app-123",
				workspaceId: "workspace-123",
			}),
		);

		await waitFor(() => {
			expect(mockUseWebSocket).toHaveBeenCalled();
		});

		const [[, options]] = mockUseWebSocket.mock.calls;

		expect(options.shouldReconnect({ code: 1006 })).toBe(true);

		for (let i = 0; i < 10; i++) {
			options.reconnectInterval(i);

			if (i < 9) {
				expect(options.shouldReconnect({ code: 1006 })).toBe(true);
			}
		}

		expect(options.shouldReconnect({ code: 1006 })).toBe(false);
	});
});

describe("Type Guards", () => {
	it("isSourceProcessingNotificationMessage should correctly identify source notifications", async () => {
		const { isSourceProcessingNotificationMessage } = await import("./use-application-notifications");
		const { SourceIndexingStatus } = await import("@/enums");

		const validNotification = SourceProcessingNotificationMessageFactory.build({
			data: {
				identifier: "test.pdf",
				indexing_status: SourceIndexingStatus.INDEXING,
				parent_id: "test-id",
				parent_type: "grant_template",
				rag_source_id: "source-1",
			},
			event: "source_processing",
			parent_id: "test-id",
			type: "data",
		});

		expect(isSourceProcessingNotificationMessage(validNotification)).toBe(true);

		const invalidNotification = {
			data: {
				message: "Some other message",
			},
			event: "other_event",
			parent_id: "test-id",
			type: "data",
		};

		expect(isSourceProcessingNotificationMessage(invalidNotification)).toBe(false);
	});

	it("isRagProcessingStatusMessage should correctly identify RAG status messages", async () => {
		const { isRagProcessingStatusMessage } = await import("./use-application-notifications");

		const validNotification = RagProcessingStatusMessageFactory.build({
			data: {
				data: { section_count: 5 },
				event: "grant_template_extraction",
				message: "Extracting sections...",
			},
			event: "grant_template_extraction",
			parent_id: "test-id",
			type: "data",
		});

		expect(isRagProcessingStatusMessage(validNotification)).toBe(true);

		const validNotificationWithoutData = RagProcessingStatusMessageFactory.build({
			data: {
				data: undefined,
				event: "grant_template_extraction",
				message: "Processing...",
			},
			event: "grant_template_extraction",
			parent_id: "test-id",
			type: "data",
		});

		expect(isRagProcessingStatusMessage(validNotificationWithoutData)).toBe(true);

		const invalidNotification = {
			data: {
				identifier: "test.pdf",
			},
			event: "source_processing",
			parent_id: "test-id",
			type: "data",
		};

		expect(isRagProcessingStatusMessage(invalidNotification)).toBe(false);
	});

	it("isRagProcessingStatusMessage should correctly identify messages with pipeline stages", async () => {
		const { isRagProcessingStatusMessage } = await import("./use-application-notifications");

		const notificationWithStages = {
			data: {
				current_pipeline_stage: 4,
				event: "generating_section_texts",
				message: "Generating text for all grant sections...",
				total_pipeline_stages: 9,
			},
			event: "generating_section_texts",
			parent_id: "test-id",
			type: "data",
		};

		expect(isRagProcessingStatusMessage(notificationWithStages)).toBe(true);
	});
});