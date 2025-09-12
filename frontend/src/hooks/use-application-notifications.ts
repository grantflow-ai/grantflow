import { createTypeGuard, isRecord } from "@tool-belt/type-predicates";
import { useCallback, useEffect, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

import { getOtp } from "@/actions/otp";
import type { SourceIndexingStatus } from "@/enums";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger/client";

export type AutofillProgressMessage = WebsocketMessage<AutofillProgressNotification>;

export interface AutofillProgressNotification {
	autofill_type: "research_deep_dive" | "research_plan";
	current_stage?: number;
	data?: Record<string, unknown>;
	field_name?: string;
	message: string;
	total_stages?: number;
}

export interface RagProcessingStatus {
	current_pipeline_stage?: number;
	data?: Record<string, unknown>;
	event: string;
	message: string;
	total_pipeline_stages?: number;
}
export type RagProcessingStatusMessage = WebsocketMessage<RagProcessingStatus>;

export interface SourceProcessingNotification {
	identifier: string;
	indexing_status: SourceIndexingStatus;
	source_id: string;
	trace_id?: string;
}
export type SourceProcessingNotificationMessage = WebsocketMessage<SourceProcessingNotification>;

export interface WebsocketMessage<T> {
	data: T;
	event: string;
	parent_id: string;
	trace_id?: string;
	type: "data" | "error" | "info";
}

export const isWebsocketMessage = createTypeGuard<WebsocketMessage<unknown>>(
	(value: unknown) => isRecord(value) && "type" in value,
);
export const isSourceProcessingNotificationMessage = createTypeGuard<SourceProcessingNotificationMessage>(
	(value: unknown) =>
		isWebsocketMessage(value) &&
		isRecord(value.data) &&
		"indexing_status" in value.data &&
		"source_id" in value.data,
);
export const isRagProcessingStatusMessage = createTypeGuard<RagProcessingStatusMessage>(
	(value: unknown) =>
		isWebsocketMessage(value) && isRecord(value.data) && "event" in value.data && "message" in value.data,
);
export const isAutofillProgressMessage = createTypeGuard<AutofillProgressMessage>(
	(value: unknown) =>
		isWebsocketMessage(value) && isRecord(value.data) && "autofill_type" in value.data && "message" in value.data,
);

export const CONNECTION_STATUS_MAP = {
	[ReadyState.CLOSED]: "Closed",
	[ReadyState.CLOSING]: "Closing",
	[ReadyState.CONNECTING]: "Connecting",
	[ReadyState.OPEN]: "Open",
	[ReadyState.UNINSTANTIATED]: "Uninstantiated",
} as const;

export const CONNECTION_STATUS_COLOR_MAP = {
	[ReadyState.CLOSED]: "bg-red-500",
	[ReadyState.CLOSING]: "bg-orange-500",
	[ReadyState.CONNECTING]: "bg-yellow-500",
	[ReadyState.OPEN]: "bg-green-500",
	[ReadyState.UNINSTANTIATED]: "bg-gray-500",
} as const;

interface UseApplicationNotificationsProps {
	applicationId: null | string | undefined;
	organizationId: string | undefined;
	projectId: string | undefined;
}

interface UseApplicationNotificationsReturn {
	connectionStatus: string;
	connectionStatusColor: string;
	notifications: WebsocketMessage<unknown>[];
	readyState: ReadyState;
	sendMessage: (message: string) => void;
}

const RECONNECT_INTERVAL_BASE = 1000;
const RECONNECT_INTERVAL_MAX = 30_000;
const RECONNECT_ATTEMPTS_MAX = 10;

export function useApplicationNotifications({
	applicationId,
	organizationId,
	projectId,
}: UseApplicationNotificationsProps): UseApplicationNotificationsReturn {
	const [notifications, setNotifications] = useState<WebsocketMessage<unknown>[]>([]);
	const reconnectAttemptRef = useRef(0);

	useEffect(() => {
		log.info("[useApplicationNotifications] Application ID changed, clearing notifications", {
			applicationId,
			organizationId,
			previousNotificationCount: notifications.length,
			projectId,
		});
		setNotifications([]);
		reconnectAttemptRef.current = 0;
	}, [applicationId, organizationId, projectId, notifications.length]);

	const getSocketUrl = useCallback(async () => {
		log.info("[useApplicationNotifications] Generating WebSocket URL", {
			applicationId,
			hasAllIds: !!(organizationId && projectId && applicationId),
			organizationId,
			projectId,
		});

		if (!(organizationId && projectId && applicationId)) {
			const error = new Error("Organization ID, Project ID and Application ID are required");
			log.error("[useApplicationNotifications] Missing required IDs for WebSocket connection", error, {
				applicationId,
				organizationId,
				projectId,
			});
			throw error;
		}

		try {
			const response = await getOtp();
			log.info("[useApplicationNotifications] OTP retrieved successfully", {
				applicationId,
				organizationId,
				otpLength: response.otp.length,
				projectId,
			});

			const baseUrl = getEnv()
				.NEXT_PUBLIC_BACKEND_API_BASE_URL.replace(/^https/, "wss")
				.replace(/^http/, "ws");

			const socketUrl = new URL(
				`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}/notifications?otp=${response.otp}`,
				baseUrl,
			).toString();

			log.info("[useApplicationNotifications] WebSocket URL generated", {
				applicationId,
				baseUrl,
				organizationId,
				projectId,
				urlPrefix: socketUrl.slice(0, Math.max(0, socketUrl.indexOf("?otp="))),
			});

			return socketUrl;
		} catch (error) {
			log.error("[useApplicationNotifications] Failed to generate WebSocket URL", error, {
				applicationId,
				organizationId,
				projectId,
			});
			throw error;
		}
	}, [organizationId, projectId, applicationId]);

	const { lastJsonMessage, readyState, sendMessage } = useWebSocket(
		organizationId && projectId && applicationId ? getSocketUrl : null,
		{
			onClose: (event) => {
				log.warn("[useApplicationNotifications] WebSocket closed", {
					applicationId,
					code: event.code,
					maxReconnectAttempts: RECONNECT_ATTEMPTS_MAX,
					organizationId,
					projectId,
					reason: event.reason || "No reason provided",
					reconnectAttempt: reconnectAttemptRef.current,
					wasClean: event.wasClean,
					willReconnect: event.code !== 1000 && reconnectAttemptRef.current < RECONNECT_ATTEMPTS_MAX,
				});
			},
			onError: (event) => {
				log.error("[useApplicationNotifications] WebSocket error", undefined, {
					applicationId,
					error: {
						fullEvent: JSON.stringify(event),
						message: (event as unknown as { message?: string }).message ?? "Unknown error",
						type: event.type,
					},
					organizationId,
					projectId,
					readyState: CONNECTION_STATUS_MAP[readyState],
					reconnectAttempt: reconnectAttemptRef.current,
				});
			},
			onMessage: (event) => {
				log.info("[useApplicationNotifications] WebSocket raw message received", {
					applicationId,
					dataLength: (event.data as string).length,
					dataType: typeof event.data,
					organizationId,
					projectId,
					rawData: event.data,
					readyState: CONNECTION_STATUS_MAP[readyState],
				});
			},
			onOpen: () => {
				log.info("[useApplicationNotifications] WebSocket connection established", {
					applicationId,
					organizationId,
					previousReconnectAttempts: reconnectAttemptRef.current,
					projectId,
					readyState: CONNECTION_STATUS_MAP[ReadyState.OPEN],
				});
				reconnectAttemptRef.current = 0;
			},
			onReconnectStop: (numAttempts) => {
				log.error("[useApplicationNotifications] WebSocket reconnection stopped", undefined, {
					applicationId,
					maxAttempts: RECONNECT_ATTEMPTS_MAX,
					organizationId,
					projectId,
					totalAttempts: numAttempts,
				});
			},
			reconnectInterval: (attemptNumber) => {
				reconnectAttemptRef.current = attemptNumber + 1;
				const interval = Math.min(RECONNECT_INTERVAL_BASE * 2 ** attemptNumber, RECONNECT_INTERVAL_MAX);
				log.info("[useApplicationNotifications] WebSocket reconnecting", {
					applicationId,
					attemptNumber: attemptNumber + 1,
					maxAttempts: RECONNECT_ATTEMPTS_MAX,
					nextReconnectIn: `${interval}ms`,
					organizationId,
					projectId,
				});
				return interval;
			},
			shouldReconnect: (closeEvent) => {
				const should = closeEvent.code !== 1000 && reconnectAttemptRef.current < RECONNECT_ATTEMPTS_MAX;
				log.info("[useApplicationNotifications] WebSocket reconnection decision", {
					applicationId,
					code: closeEvent.code,
					maxAttempts: RECONNECT_ATTEMPTS_MAX,
					organizationId,
					projectId,
					reason: closeEvent.reason || "No reason provided",
					reconnectAttempt: reconnectAttemptRef.current,
					shouldReconnect: should,
				});
				return should;
			},
		},
	);

	const getMessageType = useCallback((message: WebsocketMessage<unknown>): string => {
		if (isSourceProcessingNotificationMessage(message)) return "SourceProcessingNotification";
		if (isRagProcessingStatusMessage(message)) return "RagProcessingStatus";
		if (isAutofillProgressMessage(message)) return "AutofillProgress";
		return "Unknown";
	}, []);

	const handleValidMessage = useCallback(
		(message: WebsocketMessage<unknown>): void => {
			const messageType = getMessageType(message);

			log.info("[useApplicationNotifications] Valid WebSocket message identified", {
				applicationId,
				dataKeys: message.data ? Object.keys(message.data) : [],
				event: message.event,
				messageType,
				organizationId,
				parentId: message.parent_id,
				projectId,
				traceId: message.trace_id,
				type: message.type,
			});

			if (message.parent_id !== applicationId) {
				return;
			}

			setNotifications((prev) => {
				const newNotifications = [...prev, message];
				log.info("[useApplicationNotifications] Message added to notifications", {
					applicationId,
					event: message.event,
					messageType,
					newCount: newNotifications.length,
					organizationId,
					previousCount: prev.length,
					projectId,
				});
				return newNotifications;
			});
		},
		[applicationId, getMessageType, organizationId, projectId],
	);

	const handleInvalidMessage = useCallback(
		(message: unknown): void => {
			log.warn("[useApplicationNotifications] Received invalid WebSocket message format", {
				applicationId,
				expectedKeys: ["type", "event", "parent_id", "data"],
				message: JSON.stringify(message),
				organizationId,
				projectId,
				receivedKeys: Object.keys(message as object),
			});
		},
		[applicationId, organizationId, projectId],
	);

	useEffect(() => {
		if (!lastJsonMessage) {
			return;
		}

		log.info("[useApplicationNotifications] Processing parsed WebSocket message", {
			applicationId,
			isValidMessage: isWebsocketMessage(lastJsonMessage),
			message: JSON.stringify(lastJsonMessage),
			messageKeys: Object.keys(lastJsonMessage),
			messageType: typeof lastJsonMessage,
			organizationId,
			projectId,
		});

		if (isWebsocketMessage(lastJsonMessage)) {
			handleValidMessage(lastJsonMessage);
		} else {
			handleInvalidMessage(lastJsonMessage);
		}
	}, [lastJsonMessage, organizationId, projectId, applicationId, handleValidMessage, handleInvalidMessage]);

	const connectionStatus = CONNECTION_STATUS_MAP[readyState];
	const connectionStatusColor = CONNECTION_STATUS_COLOR_MAP[readyState];

	useEffect(() => {
		log.info("[useApplicationNotifications] WebSocket state changed", {
			applicationId,
			connectionStatus,
			notificationCount: notifications.length,
			organizationId,
			projectId,
			readyState,
			reconnectAttempts: reconnectAttemptRef.current,
		});
	}, [readyState, applicationId, organizationId, projectId, connectionStatus, notifications.length]);

	return {
		connectionStatus,
		connectionStatusColor,
		notifications,
		readyState,
		sendMessage,
	};
}
