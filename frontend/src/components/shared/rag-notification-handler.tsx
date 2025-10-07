"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { RagProcessingStatusMessage } from "@/hooks/use-application-notifications";
import { ERROR_EVENTS, type NotificationEvent, SUCCESS_EVENTS, WARNING_EVENTS } from "@/types/notification-events";

interface NotificationHandlerProps {
	notification: RagProcessingStatusMessage;
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

function formatCfpDataExtracted(data: Record<string, unknown>): string {
	const organization = data.organization as string;
	const subject = data.subject as string;

	if (!isUnknownOrganization(organization) && subject) {
		return `Extracted grant details from organization ${organization}: ${subject.slice(0, 60)}...`;
	}
	if (subject) {
		return `Extracted grant details: ${subject.slice(0, 60)}...`;
	}
	return "Successfully extracted grant application details";
}

function formatGrantTemplateCreated(data: Record<string, unknown>): string {
	const sections = data.sections_created as number;
	const organization = data.organization as string;
	const orgName = isUnknownOrganization(organization) ? "grant application" : organization;
	return `Created template with ${sections} sections for ${orgName}`;
}

function formatObjectivesEnriched(data: Record<string, unknown>): string {
	const objectives = data.objectives as number;
	const tasks = data.tasks as number;
	return `Enriched ${objectives} ${pluralize(objectives, "objective")} with ${tasks} research ${pluralize(tasks, "task")}`;
}

function formatResearchPlanCompleted(data: Record<string, unknown>): string {
	const objectives = data.objectives as number;
	const tasks = data.tasks as number;
	const words = data.words as number;
	return `Research plan ready with ${objectives} ${pluralize(objectives, "objective")}, ${tasks} ${pluralize(tasks, "task")} (${words} words)`;
}

function isNotificationEvent(event: string): event is NotificationEvent {
	return (
		ERROR_EVENTS.has(event as NotificationEvent) ||
		WARNING_EVENTS.has(event as NotificationEvent) ||
		SUCCESS_EVENTS.has(event as NotificationEvent)
	);
}

const MESSAGE_GENERATORS: Partial<Record<NotificationEvent, (data: Record<string, unknown>) => string>> = {
	cfp_data_extracted: formatCfpDataExtracted,
	grant_application_generation_completed: (d) =>
		`Application complete with ${(d.word_count as number).toLocaleString()} words`,
	grant_template_created: formatGrantTemplateCreated,
	metadata_generated: (d) => `Generated metadata for ${d.sections_created as number} sections`,
	objectives_enriched: formatObjectivesEnriched,
	relationships_extracted: (d) => {
		const count = d.relationships_count as number;
		return `Identified ${count} ${pluralize(count, "relationship")}`;
	},
	research_plan_completed: formatResearchPlanCompleted,
	section_texts_generated: (d) => {
		const sections = d.sections_generated as number;
		return `Generated content for ${sections} ${pluralize(sections, "section")}`;
	},
	wikidata_enhancement_complete: (d) => {
		const terms = d.terms_added as number;
		return `Enhanced content with ${terms} additional ${pluralize(terms, "term")}`;
	},
};

function generateMessageFromEvent(event: NotificationEvent, data: Record<string, unknown>): string {
	const generator = MESSAGE_GENERATORS[event];
	return generator ? generator(data) : `Processing ${event.replaceAll("_", " ")}`;
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
