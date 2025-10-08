"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { RagProcessingStatusMessage } from "@/hooks/use-application-notifications";
import {
	ERROR_EVENTS,
	isNotificationEvent,
	isProgressEvent,
	type NotificationEvent,
	SUCCESS_EVENTS,
	WARNING_EVENTS,
} from "@/types/notification-events";

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

	if (!isNotificationEvent(event)) {
		return undefined;
	}

	const message = generateMessageFromEvent(event, data);

	switch (notification.type) {
		case "error": {
			showErrorToast(message, data, notification.type);
			break;
		}
		case "info": {
			showInfoToast(message, data, notification.type);
			break;
		}
		case "success": {
			showSuccessToast(message, event, notification.type);
			break;
		}
		case "warning": {
			showWarningToast(message, data, notification.type);
			break;
		}
		default: {
			if (ERROR_EVENTS.has(event)) {
				showErrorToast(message, data, "error");
			} else if (WARNING_EVENTS.has(event)) {
				showWarningToast(message, data, "warning");
			} else if (SUCCESS_EVENTS.has(event)) {
				showSuccessToast(message, event, "success");
			} else {
				showInfoToast(message, data, "info");
			}
		}
	}

	return undefined;
}

const MESSAGE_GENERATORS: {
	[K in keyof ProgressEventDataMap]: (data: ProgressEventDataMap[K]) => string;
} = {
	cfp_data_extracted: (d) => {
		if (!isUnknownOrganization(d.organization) && d.subject) {
			return `Extracted grant details from organization ${d.organization}: ${d.subject.slice(0, 60)}...`;
		}
		if (d.subject) {
			return `Extracted grant details: ${d.subject.slice(0, 60)}...`;
		}
		return "Successfully extracted grant application details";
	},
	grant_application_generation_completed: (d) => `Application complete with ${d.word_count.toLocaleString()} words`,
	grant_template_created: (d) => {
		const orgName = isUnknownOrganization(d.organization) ? "grant application" : d.organization;
		return `Created template with ${d.sections_created} sections for ${orgName}`;
	},
	metadata_generated: (d) => `Generated metadata for ${d.sections_created} sections`,
	objectives_enriched: (d) =>
		`Enriched ${d.objectives} ${pluralize(d.objectives, "objective")} with ${d.tasks} research ${pluralize(d.tasks, "task")}`,
	relationships_extracted: (d) =>
		`Identified ${d.relationships_count} ${pluralize(d.relationships_count, "relationship")}`,
	research_plan_completed: (d) =>
		`Research plan ready with ${d.objectives} ${pluralize(d.objectives, "objective")}, ${d.tasks} ${pluralize(d.tasks, "task")} (${d.words} words)`,
	section_texts_generated: (d) =>
		`Generated content for ${d.sections_generated} ${pluralize(d.sections_generated, "section")}`,
	wikidata_enhancement_complete: (d) =>
		`Enhanced content with ${d.terms_added} additional ${pluralize(d.terms_added, "term")}`,
};

function generateMessageFromEvent(event: NotificationEvent, data: Record<string, unknown>): string {
	if (isProgressEvent(event)) {
		// TypeScript limitation: indexing MESSAGE_GENERATORS with union type creates intersection
		// Safe to cast as never because isProgressEvent guarantees the data matches the event type at runtime
		const generator = MESSAGE_GENERATORS[event as keyof typeof MESSAGE_GENERATORS];
		return generator(data as never);
	}
	return formatEventName(event);
}

function isUnknownOrganization(organization: string | undefined): boolean {
	return !organization || organization.toLowerCase() === "unknown";
}

function pluralize(count: number, singular: string, plural?: string): string {
	return count === 1 ? singular : (plural ?? `${singular}s`);
}

function shouldDismissToast(event: string, _previousEvent: null | string, toastId: ToastId): boolean {
	if (!toastId) return false;
	return ERROR_EVENTS.has(event as NotificationEvent);
}

function showErrorToast(message: string, data: Record<string, unknown> | undefined, type: string): void {
	const recoverable = data?.recoverable as boolean | undefined;
	const prefix = type === "error" ? "❌ Error: " : "";
	toast.error(`${prefix}${message}`, {
		description: recoverable ? "Please follow the instructions above to resolve this issue." : undefined,
		duration: 10_000,
	});
}

function showInfoToast(message: string, data: Record<string, unknown> | undefined, type: string): void {
	const description =
		data && Object.keys(data).length > 0
			? Object.entries(data)
					.filter(([key]) => key !== "event" && key !== "message")
					.map(([key, value]) => `${key}: ${value}`)
					.join(", ")
			: undefined;
	const prefix = type === "info" ? "ℹ️ " : "";
	toast.info(`${prefix}${message}`, { description });
}

const formatEventName = (event: string): string => {
	return event
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
};

function showSuccessToast(message: string, event: string, _type: string): void {
	const isCompletion = event.includes("completed");
	const prefix = isCompletion ? "✅ Completed: " : "✓ ";
	const formattedEvent = formatEventName(event);
	toast.success(`${prefix}${formattedEvent}`, {
		description: message,
		duration: isCompletion ? 8000 : 5000,
	});
}

function showWarningToast(message: string, data: Record<string, unknown> | undefined, _type: string): void {
	const suggestion = data?.suggestion as string | undefined;
	const isRetryable = data?.retryable !== false;

	const description = suggestion ?? (isRetryable ? "This operation will be automatically retried." : undefined);

	toast.warning(`⚠️ ${message}`, {
		description,
		duration: 8000,
	});
}
