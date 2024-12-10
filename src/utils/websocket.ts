import { wait } from "@/utils/time";
import { getEnv } from "@/utils/env";

export const WS_STATUS_OK = 1000;
export const PING_INTERVAL = 15_000;

export interface WebsocketHandler<T> {
	closeSocket: () => void;
	isClosed: () => boolean;
	sendMessage: (message: T) => Promise<void>;
}

/**
 * Create a websocket connection to the backend.
 *
 * @param applicationId string The application id to connect to
 * @param handleClose function The function to call when the websocket is closed
 * @param handleError function The function to call when an error occurs
 * @param handleMessage function The function to call when a message is received
 * @param workspaceId string The workspace id to connect to
 * @returns a websocket handler
 * @template S The type of the message to send
 * @template R The type of the message to receive
 */
export function createWebsocket<S, R>({
	applicationId,
	handleClose,
	handleError,
	handleMessage,
	workspaceId,
}: {
	applicationId: string;
	handleClose: (isError: boolean, reason: string) => void;
	handleError: (error: Error | Event) => void;
	handleMessage: (event: MessageEvent<R>) => void;
	workspaceId: string;
}): WebsocketHandler<S> {
	const websocket = new WebSocket(
		new URL(
			`workspaces/${workspaceId}/applications/${applicationId}/ws`,
			getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL,
		),
	);

	let pingInterval: NodeJS.Timeout;

	websocket.addEventListener("open", () => {
		if (websocket.readyState === WebSocket.OPEN) {
			pingInterval = setInterval(() => {
				if (websocket.readyState === WebSocket.OPEN) {
					websocket.send("ping");
				}
			}, PING_INTERVAL);
		}
	});
	websocket.addEventListener("close", ({ code, reason }) => {
		clearInterval(pingInterval);
		handleClose(code !== WS_STATUS_OK, reason);
	});
	websocket.addEventListener("error", (event) => {
		handleError(new Error(`an error has occurred: ${event.target}`));
	});
	websocket.addEventListener("message", (event: MessageEvent<string>) => {
		const data = JSON.parse(event.data) as R;
		handleMessage({ ...event, data });
	});

	const isClosed = () => websocket.readyState === WebSocket.CLOSED || websocket.readyState === WebSocket.CLOSING;

	return {
		closeSocket: () => {
			clearInterval(pingInterval);
			websocket.close(WS_STATUS_OK, "user action");
		},
		isClosed,
		sendMessage: async (message: S) => {
			if (isClosed()) {
				throw new Error("websocket is closed");
			}

			while (websocket.readyState === WebSocket.CONNECTING) {
				await wait(100);
			}

			if (websocket.readyState === WebSocket.OPEN) {
				websocket.send(JSON.stringify(message));
			}
		},
	};
}
