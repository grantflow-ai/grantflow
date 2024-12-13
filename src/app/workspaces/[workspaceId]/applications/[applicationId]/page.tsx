"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { useParams } from "next/navigation";
import { getEnv } from "@/utils/env";
import ReactMarkdown from "react-markdown";
import { Button } from "gen/ui/button";
import { Input } from "gen/ui/input";
import { ScrollArea } from "gen/ui/scroll-area";
import { Badge } from "gen/ui/badge";
import { ChatMessage } from "@/types/api-types";
import { getOtp } from "@/app/actions/api";
import { toast } from "sonner";
import { logError } from "@/utils/logging";

const connectionStatusMap = {
	[ReadyState.CONNECTING]: "connecting",
	[ReadyState.OPEN]: "connected",
	[ReadyState.CLOSING]: "closing",
	[ReadyState.CLOSED]: "closed",
	[ReadyState.UNINSTANTIATED]: "connecting",
};

const isChatMessage = (value: unknown): value is ChatMessage => {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	return Reflect.has(value, "type") && (Reflect.has(value, "text") || Reflect.has(value, "data"));
};

const createWebsocketUrl = async (workspaceId: string, applicationId: string) => {
	try {
		const { otp } = await getOtp();

		return new URL(
			`workspaces/${workspaceId}/applications/${applicationId}/chat-room?otp=${otp}`,
			getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL.replace("http", "ws"),
		).toString();
	} catch (error) {
		logError({ error, identifier: "getOtp" });
		toast.error("Failed to authenticate websocket connection");
	}
};

const downloadMarkdown = (content: string) => {
	const element = document.createElement("a");
	const file = new Blob([content], { type: "text/markdown" });
	element.href = URL.createObjectURL(file);
	element.download = "application_draft.md";
	document.body.append(element);
	element.click();
	element.remove();
};

export default function ApplicationChatRoomPage() {
	const { workspaceId, applicationId } = useParams<{
		workspaceId: string;
		applicationId: string;
	}>();
	const [url, setUrl] = useState<string | null>(null);

	useEffect(() => {
		if (workspaceId && applicationId) {
			(async () => {
				const websocketUrl = await createWebsocketUrl(workspaceId, applicationId);
				if (websocketUrl) {
					setUrl(websocketUrl);
				}
			})();
		}
	}, []);

	return url ? <ChatRoom url={url} /> : <div>Loading...</div>;
}

function ChatRoom({ url }: { url: string }) {
	const [messageHistory, setMessageHistory] = useState<ChatMessage[]>([]);
	const [inputMessage, setInputMessage] = useState("");

	const chatContainerRef = useRef<HTMLDivElement>(null);

	const { sendMessage, lastJsonMessage, readyState } = useWebSocket(url, {
		onOpen: () => {
			console.log("opened");
		},
		shouldReconnect: (closeEvent) => {
			console.log("close event", closeEvent);
			return true;
		},
	});

	useEffect(() => {
		if (isChatMessage(lastJsonMessage)) {
			console.log("Received message:", JSON.stringify(lastJsonMessage));
			setMessageHistory((prev) => [...prev, lastJsonMessage]);
		}
	}, [lastJsonMessage]);

	useEffect(() => {
		if (chatContainerRef.current) {
			chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
		}
	}, [messageHistory]);

	const handleSendMessage = useCallback(() => {
		if (inputMessage.trim()) {
			sendMessage(inputMessage);
			setInputMessage("");
		}
	}, [inputMessage, sendMessage]);

	const connectionStatus = connectionStatusMap[readyState];
	return (
		<div className="flex flex-col h-screen max-h-screen" data-testid="chat-room">
			<div className="p-4 flex justify-between items-center">
				<h1 className="text-2xl font-bold">Application </h1>
				<Badge variant="outline" data-testid="connection-status">
					status: {connectionStatus}
				</Badge>
			</div>
			<ScrollArea className="flex-grow p-4" data-testid="chat-messages">
				{messageHistory.map((message, index) => (
					<div key={index} className="mb-4">
						{message.type === "notification" && (
							<p className="text-muted-foreground italic" data-testid="notification-message">
								{message.text}
							</p>
						)}
						{message.type === "error" && (
							<p className="text-destructive font-semibold" data-testid="error-message">
								{message.text}
							</p>
						)}
						{message.type === "content" && (
							<div className="bg-secondary p-4 rounded-lg" data-testid="content-message">
								<ScrollArea className="h-[200px] w-full">
									<ReactMarkdown>{message.data.content}</ReactMarkdown>
								</ScrollArea>
								<p className="text-sm text-muted-foreground mt-2">
									Duration: {message.data.duration} seconds
								</p>
								<div className="mt-2 flex justify-end space-x-2">
									<Button
										onClick={() => {
											void navigator.clipboard.writeText(message.data.content);
										}}
										variant="outline"
										size="sm"
										data-testid="copy-button"
										aria-label="Copy content"
									>
										Copy
									</Button>
									<Button
										onClick={() => {
											downloadMarkdown(message.data.content);
										}}
										variant="outline"
										size="sm"
										data-testid="download-button"
										aria-label="Download content"
									>
										Download
									</Button>
								</div>
							</div>
						)}
					</div>
				))}
			</ScrollArea>
			<div className="p-4 bg-background">
				<div className="flex space-x-2">
					<Input
						type="text"
						value={inputMessage}
						onChange={(e) => {
							setInputMessage(e.target.value);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleSendMessage();
							}
						}}
						placeholder="Type a message..."
						className="flex-grow"
						data-testid="message-input"
						aria-label="Type a message"
					/>
					<Button onClick={handleSendMessage} data-testid="send-button" aria-label="Send message">
						Send
					</Button>
				</div>
			</div>
		</div>
	);
}
