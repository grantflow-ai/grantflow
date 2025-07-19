import { createTypeGuard, isRecord } from "@tool-belt/type-predicates";
import { useCallback, useEffect, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

import { getOtp } from "@/actions/otp";
import type { SourceIndexingStatus } from "@/enums";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";

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

	const getSocketUrl = useCallback(async () => {
		if (!(organizationId && projectId && applicationId)) {
			throw new Error("Organization ID, Project ID and Application ID are required");
		}

		const response = await getOtp();
		const baseUrl = getEnv()
			.NEXT_PUBLIC_BACKEND_API_BASE_URL.replace(/^https/, "wss")
			.replace(/^http/, "ws");

		return new URL(
			`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}/notifications?otp=${response.otp}`,
			baseUrl,
		).toString();
	}, [organizationId, projectId, applicationId]);

	const { lastJsonMessage, readyState, sendMessage } = useWebSocket<WebsocketMessage<unknown>>(
		organizationId && projectId && applicationId ? getSocketUrl : null,
		{
			onOpen: () => {
				log.info("[useApplicationNotifications] WebSocket opened", {
					applicationId,
					organizationId,
					projectId,
				});
				reconnectAttemptRef.current = 0;
			},
			reconnectInterval: (attemptNumber) => {
				reconnectAttemptRef.current = attemptNumber + 1;
				return Math.min(RECONNECT_INTERVAL_BASE * 2 ** attemptNumber, RECONNECT_INTERVAL_MAX);
			},
			shouldReconnect: (closeEvent) => {
				return closeEvent.code !== 1000 && reconnectAttemptRef.current < RECONNECT_ATTEMPTS_MAX;
			},
		},
	);

	useEffect(() => {
		log.info("[useApplicationNotifications] Received WebSocket message", {
			applicationId,
			isValidMessage: isWebsocketMessage(lastJsonMessage),
			message: lastJsonMessage,
			messageType: typeof lastJsonMessage,
			organizationId,
			projectId,
		});

		if (isWebsocketMessage(lastJsonMessage)) {
			setNotifications((prev) => {
				const newNotifications = [...prev, lastJsonMessage];
				log.info("[useApplicationNotifications] Added message to notifications", {
					applicationId,
					messageEvent: lastJsonMessage.event,
					organizationId,
					projectId,
					totalNotifications: newNotifications.length,
				});
				return newNotifications;
			});
		}
	}, [lastJsonMessage, organizationId, projectId, applicationId]);

	const connectionStatus = CONNECTION_STATUS_MAP[readyState];
	const connectionStatusColor = CONNECTION_STATUS_COLOR_MAP[readyState];

	return {
		connectionStatus,
		connectionStatusColor,
		notifications,
		readyState,
		sendMessage,
	};
}
