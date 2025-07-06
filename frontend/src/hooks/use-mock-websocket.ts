/**
 * WebSocket hook that integrates with mock API system
 * Provides seamless WebSocket connectivity in both development and production
 */

import { useCallback, useMemo } from "react";
import useWebSocket, { type Options, type ReadyState } from "react-use-websocket";
import { getWebSocketUrl } from "@/dev-tools/mock-api/websocket";

interface UseMockWebSocketOptions extends Omit<Options, "shouldReconnect"> {
	/**
	 * Whether to automatically reconnect on connection loss
	 * @default true
	 */
	shouldReconnect?: ((closeEvent: CloseEvent) => boolean) | boolean;
}

interface UseMockWebSocketReturn {
	/**
	 * Get the WebSocket URL being used
	 */
	getWebSocketUrl: () => null | string;

	/**
	 * Last received message
	 */
	lastMessage: MessageEvent<any> | null;

	/**
	 * Connection ready state
	 */
	readyState: ReadyState;

	/**
	 * Send a JSON message through the WebSocket
	 */
	sendJsonMessage: (message: any) => void;

	/**
	 * Send a message through the WebSocket
	 */
	sendMessage: (message: string) => void;
}

/**
 * Hook for application-specific WebSocket notifications
 *
 * @param projectId - Project ID
 * @param applicationId - Application ID
 * @param options - WebSocket options
 */
export function useApplicationWebSocket(
	projectId: string,
	applicationId: string,
	options: UseMockWebSocketOptions = {},
) {
	const path = `/projects/${projectId}/applications/${applicationId}/notifications`;
	return useMockWebSocket(path, options);
}

/**
 * Custom hook for WebSocket connections that automatically handles mock vs real URLs
 *
 * @param path - The WebSocket path (e.g., "/projects/123/applications/456/notifications")
 * @param options - WebSocket options
 * @returns WebSocket connection state and methods
 */
export function useMockWebSocket(path: string, options: UseMockWebSocketOptions = {}): UseMockWebSocketReturn {
	const socketUrl = useMemo(() => {
		try {
			return getWebSocketUrl(path);
		} catch {
			return null;
		}
	}, [path]);

	const defaultShouldReconnect = useCallback((closeEvent: CloseEvent) => {
		return closeEvent.code !== 1000 && closeEvent.code !== 1001;
	}, []);

	const { lastMessage, readyState, sendJsonMessage, sendMessage } = useWebSocket(socketUrl, {
		...options,
		reconnectAttempts: 5,
		reconnectInterval: 3000,
		shouldReconnect:
			typeof options.shouldReconnect === "boolean"
				? () => options.shouldReconnect as boolean
				: (options.shouldReconnect ?? defaultShouldReconnect),
	});

	const getWebSocketUrlCallback = useCallback(() => {
		return socketUrl;
	}, [socketUrl]);

	return {
		getWebSocketUrl: getWebSocketUrlCallback,
		lastMessage,
		readyState,
		sendJsonMessage,
		sendMessage,
	};
}

/**
 * Hook for project-level WebSocket notifications
 *
 * @param projectId - Project ID
 * @param options - WebSocket options
 */
export function useProjectWebSocket(projectId: string, options: UseMockWebSocketOptions = {}) {
	const path = `/projects/${projectId}/notifications`;
	return useMockWebSocket(path, options);
}

export type { ReadyState } from "react-use-websocket";
