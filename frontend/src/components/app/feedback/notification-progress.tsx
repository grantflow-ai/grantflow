import { Progress } from "@/components/ui/progress";
import type { RagProcessingStatus } from "@/hooks/use-application-notifications";

interface NotificationProgressProps {
	notification: RagProcessingStatus;
}

export function NotificationProgress({ notification }: NotificationProgressProps) {
	const { current_pipeline_stage, event, message, total_pipeline_stages } = notification;

	if (current_pipeline_stage === undefined || total_pipeline_stages === undefined) {
		return null;
	}

	const progressPercentage = Math.round((current_pipeline_stage / total_pipeline_stages) * 100);

	const getStatusIndicator = () => {
		if (event === "restored_progress") return "🔄";
		if (event.includes("started")) return "🚀";
		if (event.includes("validating")) return "🔍";
		if (event.includes("generating")) return "✨";
		if (event.includes("assembling")) return "🔧";
		if (event.includes("saving")) return "💾";
		if (event.includes("extracting")) return "📄";
		return "⚡";
	};

	return (
		<div className="space-y-2" data-testid="notification-progress">
			<div className="flex items-center justify-between text-sm">
				<p
					className="text-muted-foreground flex items-center gap-2"
					data-testid="notification-progress-message"
				>
					<span>{getStatusIndicator()}</span>
					<span>{message}</span>
				</p>
				<span className="text-muted-foreground tabular-nums" data-testid="notification-progress-stages">
					{current_pipeline_stage} / {total_pipeline_stages}
				</span>
			</div>
			<Progress value={progressPercentage} />
			<p className="text-muted-foreground text-xs" data-testid="notification-progress-percentage">
				{progressPercentage}% complete
			</p>
		</div>
	);
}