import type { RagProcessingStatusMessage } from "@/hooks/use-application-notifications";

interface NotificationProgressProps {
	notification: RagProcessingStatusMessage;
}

const EVENT_INDICATORS: Record<string, string> = {
	cancelled: "🚫",
	complete: "✅",
	completed: "✅",
	enriched: "🔧",
	error: "❌",
	extracted: "📄",
	extracting: "📄",
	failed: "❌",
	generated: "✨",
	generating: "✨",
};

export function NotificationProgress({ notification }: NotificationProgressProps) {
	const { event } = notification;
	const message = event.replaceAll("_", " ");

	return (
		<div className="space-y-2" data-testid="notification-progress">
			<div className="flex items-center">
				<p
					className="text-muted-foreground flex items-center gap-2"
					data-testid="notification-progress-message"
				>
					<span>{getStatusIndicator(event)}</span>
					<span>{message}</span>
				</p>
			</div>
		</div>
	);
}

function getStatusIndicator(event: string): string {
	for (const [keyword, indicator] of Object.entries(EVENT_INDICATORS)) {
		if (event.includes(keyword)) {
			return indicator;
		}
	}
	return "⚡";
}
