"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { RagProcessingStatusMessage } from "@/hooks/use-application-notifications";
import { isGenerationEvent, isRagEvent, isRagPipelineErrorEvent } from "@/types/notification-events";

interface NotificationHandlerProps {
	notification: RagProcessingStatusMessage;
}

interface ProgressEventDataMap {
	cfp_data_extracted: {
		deadline: null | string;
		organization: string;
		sections_count: number;
		subject: string;
	};
	grant_application_generation_completed: {
		application_id: string;
		word_count: number;
	};
	grant_template_created: {
		organization: string;
		sections_created: number;
		template_id: string;
	};
	metadata_generated: {
		organization: string;
		sections_created: number;
	};
	objectives_enriched: {
		objectives: number;
		tasks: number;
	};
	relationships_extracted: {
		relationships_count: number;
	};
	research_plan_completed: {
		objectives: number;
		tasks: number;
		words: number;
	};
	section_texts_generated: {
		sections_generated: number;
		word_count: number;
	};
	wikidata_enhancement_complete: {
		terms_added: number;
	};
}

type ToastId = number | string | undefined;

export function RagNotificationHandler({ notification }: NotificationHandlerProps) {
	const [toastId, setToastId] = useState<ToastId>();
	const previousEventRef = useRef<null | string>(null);

	useEffect(() => {
		const { event } = notification;

		if (shouldDismissToast(event, previousEventRef.current, toastId)) {
			toast.dismiss(toastId);
		}

		previousEventRef.current = event;
		const newToastId = displayNotification(notification);
		setToastId(newToastId);
	}, [notification, toastId]);

	return null;
}

function displayNotification(notification: RagProcessingStatusMessage): ToastId {
	const { data, event } = notification;

	if (!isRagEvent(event)) {
		return undefined;
	}

	const message = isGenerationEvent(event) ? MESSAGE_GENERATORS[event](data as never) : formatEventName(event);
	showToast(notification.type, message, notification);

	return undefined;
}

const MESSAGE_GENERATORS: { [K in keyof ProgressEventDataMap]: (data: ProgressEventDataMap[K]) => string } = {
	cfp_data_extracted: (d: ProgressEventDataMap["cfp_data_extracted"]) => {
		if (!isUnknownOrganization(d.organization) && d.subject) {
			return `Extracted grant details from organization ${d.organization}: ${d.subject.slice(0, 60)}...`;
		}
		if (d.subject) {
			return `Extracted grant details: ${d.subject.slice(0, 60)}...`;
		}
		return "Successfully extracted grant application details";
	},
	grant_application_generation_completed: (d: ProgressEventDataMap["grant_application_generation_completed"]) =>
		`Application complete with ${d.word_count.toLocaleString()} words`,
	grant_template_created: (d: ProgressEventDataMap["grant_template_created"]) => {
		const orgName = isUnknownOrganization(d.organization) ? "grant application" : d.organization;
		return `Created template with ${d.sections_created} sections for ${orgName}`;
	},
	metadata_generated: (d: ProgressEventDataMap["metadata_generated"]) =>
		`Generated metadata for ${d.sections_created} sections`,
	objectives_enriched: (d: ProgressEventDataMap["objectives_enriched"]) =>
		`Enriched ${d.objectives} ${pluralize(d.objectives, "objective")} with ${d.tasks} research ${pluralize(d.tasks, "task")}`,
	relationships_extracted: (d: ProgressEventDataMap["relationships_extracted"]) =>
		`Identified ${d.relationships_count} ${pluralize(d.relationships_count, "relationship")}`,
	research_plan_completed: (d: ProgressEventDataMap["research_plan_completed"]) =>
		`Research plan ready with ${d.objectives} ${pluralize(d.objectives, "objective")}, ${d.tasks} ${pluralize(d.tasks, "task")} (${d.words} words)`,
	section_texts_generated: (d: ProgressEventDataMap["section_texts_generated"]) =>
		`Generated content for ${d.sections_generated} ${pluralize(d.sections_generated, "section")}`,
	wikidata_enhancement_complete: (d: ProgressEventDataMap["wikidata_enhancement_complete"]) =>
		`Enhanced content with ${d.terms_added} additional ${pluralize(d.terms_added, "term")}`,
} as const;

function isUnknownOrganization(organization: string | undefined): boolean {
	return !organization || organization.toLowerCase() === "unknown";
}

function pluralize(count: number, singular: string, plural?: string): string {
	return count === 1 ? singular : (plural ?? `${singular}s`);
}

function shouldDismissToast(event: string, _previousEvent: null | string, toastId: ToastId): boolean {
	if (!toastId) return false;
	return isRagPipelineErrorEvent(event);
}

const formatEventName = (event: string): string => {
	return event
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
};

function showToast(type: string, message: string, context: { data: Record<string, unknown>; event: string }) {
	const { data, event } = context;

	switch (type) {
		case "error": {
			const recoverable = data.recoverable as boolean | undefined;
			const prefix = "❌ Error: ";
			toast.error(`${prefix}${message}`, {
				description: recoverable ? "Please follow the instructions above to resolve this issue." : undefined,
				duration: 10_000,
			});
			break;
		}
		case "success": {
			const isCompletion = event.includes("completed");
			const prefix = isCompletion ? "✅ Completed: " : "✓ ";
			const formattedEvent = formatEventName(event);
			toast.success(`${prefix}${formattedEvent}`, {
				description: message,
				duration: isCompletion ? 8000 : 5000,
			});
			break;
		}
		case "warning": {
			const suggestion = data.suggestion as string | undefined;
			const isRetryable = data.retryable !== false;
			const description =
				suggestion ?? (isRetryable ? "This operation will be automatically retried." : undefined);
			toast.warning(`⚠️ ${message}`, {
				description,
				duration: 8000,
			});
			break;
		}
		default: {
			const description =
				Object.keys(data).length > 0
					? Object.entries(data)
							.filter(([key]) => key !== "event" && key !== "message")
							.map(([key, value]) => `${key}: ${value}`)
							.join(", ")
					: undefined;
			const prefix = type === "info" ? "ℹ️ " : "";
			toast.info(`${prefix}${message}`, { description });
		}
	}
}
