import React, { useEffect, useMemo, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { ScrollArea } from "gen/ui/scroll-area";
import { Badge } from "gen/ui/badge";
import { Card } from "gen/ui/card";
import { ApplicationDraft, ChatMessage } from "@/types/api-types";

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

export default function ChatContainer({
	getUrl,
	onContent,
}: {
	getUrl: () => Promise<string>;
	onContent: (content: ApplicationDraft) => void;
}) {
	const chatContainerRef = useRef<HTMLDivElement>(null);

	const [messageHistory, setMessageHistory] = useState<ChatMessage[]>([]);

	const { lastJsonMessage, readyState } = useWebSocket(getUrl);
	const connectionStatus = useMemo(() => connectionStatusMap[readyState], [readyState]);

	useEffect(() => {
		if (isChatMessage(lastJsonMessage)) {
			if (lastJsonMessage.type === "content") {
				onContent(lastJsonMessage.data);
			} else {
				setMessageHistory((prev) => [...prev, lastJsonMessage]);
			}
		}
	}, [lastJsonMessage]);

	useEffect(() => {
		if (chatContainerRef.current) {
			chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
		}
	}, [messageHistory]);

	return (
		<Card className="flex flex-col h-[600px] shadow-md" data-testid="chat-container">
			<div className="p-4 flex justify-between items-center border-b">
				<h1 className="text-2xl font-bold">Generating Application</h1>
				<Badge variant="outline" data-testid="connection-status">
					{connectionStatus}
				</Badge>
			</div>
			<ScrollArea className="flex-grow p-4 space-y-4" data-testid="chat-messages">
				{messageHistory.map((message, index) => (
					<div key={index} className="p-3 rounded-md">
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
					</div>
				))}
			</ScrollArea>
		</Card>
	);
}
