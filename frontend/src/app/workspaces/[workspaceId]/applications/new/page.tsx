"use client";

import { useParams, useRouter } from "next/navigation";
import { PagePath } from "@/enums";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { getEnv } from "@/utils/env";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOtp } from "@/actions/api";

interface ChatMessage {
	data: {
		content: string;
		duration: number;
	};
	text: string;
	type: string;
}

const connectionStatusMap = {
	[ReadyState.CLOSED]: "Closed",
	[ReadyState.CLOSING]: "Closing",
	[ReadyState.CONNECTING]: "Connecting",
	[ReadyState.OPEN]: "Open",
	[ReadyState.UNINSTANTIATED]: "Uninstantiated",
};

const connectionStatusColorMap = {
	[ReadyState.CLOSED]: "bg-red-500",
	[ReadyState.CLOSING]: "bg-orange-500",
	[ReadyState.CONNECTING]: "bg-yellow-500",
	[ReadyState.OPEN]: "bg-green-500",
	[ReadyState.UNINSTANTIATED]: "bg-gray-500",
};

export default function ApplicationDetailPage() {
	const params = useParams();
	const router = useRouter();

	const workspaceId = params.workspaceId as string | undefined;
	const applicationId = params.applicationId as string | undefined;

	const [messageHistory, setMessageHistory] = useState<ChatMessage[]>([]);
	const [inputMessage, setInputMessage] = useState<string>("");

	const chatContainerRef = useRef<HTMLDivElement>(null);

	const getSocketUrl = useCallback(async () => {
		const response = await getOtp();
		return new URL(
			`workspaces/${workspaceId}/applications/${applicationId}?otp=${response.otp}`,
			getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL,
		).toString();
	}, [workspaceId, applicationId]);

	const { lastJsonMessage, readyState, sendMessage } = useWebSocket<ChatMessage>(getSocketUrl);

	useEffect(() => {
		setMessageHistory((prev) => [...prev, lastJsonMessage]);
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

	if (!workspaceId || !applicationId) {
		router.replace(PagePath.WORKSPACES);
		return null;
	}

	const connectionStatus = connectionStatusMap[readyState];
	const connectionStatusColor = connectionStatusColorMap[readyState];

	return (
		<div className="flex flex-col h-screen max-h-screen" data-testid="chat-room">
			<div className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
				<h1 className="text-2xl font-bold">WebSocket Chat</h1>
				<Badge
					className={`${connectionStatusColor} text-white`}
					data-testid="connection-status"
					variant="outline"
				>
					{connectionStatus}
				</Badge>
			</div>
			<ScrollArea className="flex-grow p-4" data-testid="chat-messages">
				{messageHistory.map((message, index) => (
					<div className="mb-4" key={index}>
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
								<ScrollArea className="h-[200px] w-full">{message.data.content}</ScrollArea>
								<p className="text-sm text-muted-foreground mt-2">
									Duration: {message.data.duration} seconds
								</p>
								<div className="mt-2 flex justify-end space-x-2">
									<Button
										aria-label="Copy content"
										data-testid="copy-button"
										onClick={() => {
											void navigator.clipboard.writeText(message.data.content);
										}}
										size="sm"
										variant="outline"
									>
										Copy
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
						aria-label="Type a message"
						className="flex-grow"
						data-testid="message-input"
						onChange={(e) => {
							setInputMessage(e.target.value);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleSendMessage();
							}
						}}
						placeholder="Type a message..."
						type="text"
						value={inputMessage}
					/>
					<Button aria-label="Send message" data-testid="send-button" onClick={handleSendMessage}>
						Send
					</Button>
				</div>
			</div>
		</div>
	);
}
