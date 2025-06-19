import { createTypeGuard, isRecord } from "@tool-belt/type-predicates";
import { useCallback, useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

import { getOtp } from "@/actions/otp";
import type { SourceIndexingStatus } from "@/enums";
import { getEnv } from "@/utils/env";

export interface RagProcessingStatus {
	data?: Record<string, unknown>;
	event: string;
	message: string;
}

export type RagProcessingStatusMessage = WebsocketMessage<RagProcessingStatus>;

export interface SourceProcessingNotification {
	identifier: string;
	indexing_status: SourceIndexingStatus;
	parent_id: string;
	parent_type: string;
	rag_source_id: string;
}
export type SourceProcessingNotificationMessage = WebsocketMessage<SourceProcessingNotification>;

export interface WebsocketMessage<T> {
	data: T;
	event: string;
	parent_id: string;
	type: "data" | "error" | "info";
}

export const isWebsocketMessage = createTypeGuard<WebsocketMessage<unknown>>(
	(value: unknown) => isRecord(value) && "type" in value,
);
export const isSourceProcessingNotificationMessage = createTypeGuard<SourceProcessingNotificationMessage>(
	(value: unknown) => isWebsocketMessage(value) && isRecord(value.data) && "indexing_status" in value.data,
);
export const isRagProcessingStatusMessage = createTypeGuard<RagProcessingStatusMessage>(
	(value: unknown) =>
		isWebsocketMessage(value) && isRecord(value.data) && "event" in value.data && "message" in value.data,
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
	workspaceId: string | undefined;
}

interface UseApplicationNotificationsReturn {
	connectionStatus: string;
	connectionStatusColor: string;
	notifications: WebsocketMessage<unknown>[];
	readyState: ReadyState;
	sendMessage: (message: string) => void;
}

export function useApplicationNotifications({
	applicationId,
	workspaceId,
}: UseApplicationNotificationsProps): UseApplicationNotificationsReturn {
	const [notifications, setNotifications] = useState<WebsocketMessage<unknown>[]>([]);

	const getSocketUrl = useCallback(async () => {
		if (!(workspaceId && applicationId)) {
			throw new Error("Workspace ID and Application ID are required");
		}

		const response = await getOtp();
		const baseUrl = getEnv()
			.NEXT_PUBLIC_BACKEND_API_BASE_URL.replace(/^https/, "wss")
			.replace(/^http/, "ws");
		return new URL(
			`workspaces/${workspaceId}/applications/${applicationId}/notifications?otp=${response.otp}`,
			baseUrl,
		).toString();
	}, [workspaceId, applicationId]);

	const { lastJsonMessage, readyState, sendMessage } = useWebSocket<WebsocketMessage<unknown>>(
		workspaceId && applicationId ? getSocketUrl : null,
	);

	useEffect(() => {
		if (isWebsocketMessage(lastJsonMessage)) {
			setNotifications((prev) => [...prev, lastJsonMessage]);
		}
	}, [lastJsonMessage]);

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
