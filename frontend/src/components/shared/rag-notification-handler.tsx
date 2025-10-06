"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { RagProcessingStatusMessage } from "@/hooks/use-application-notifications";
import {
	ERROR_EVENTS,
	type NotificationEvent,
	SUCCESS_EVENTS,
	type TemplateGenerationEvent,
	WARNING_EVENTS,
} from "@/types/notification-events";

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
			if (ERROR_EVENTS.has(event as TemplateGenerationEvent)) {
				showErrorToast(message, data, "error");
			} else if (WARNING_EVENTS.has(event as TemplateGenerationEvent)) {
				showWarningToast(message, data, "warning");
			} else if (SUCCESS_EVENTS.has(event as TemplateGenerationEvent)) {
				showSuccessToast(message, event, "success");
			} else {
				showInfoToast(message, data, "info");
			}
		}
	}

	return undefined;
}

function generateMessageFromEvent(event: string, data: Record<string, unknown>): string {
	switch (event) {
		case "cfp_data_extracted": {
			const organization = data.organization as string;
			const subject = data.subject as string;
			if (organization && organization !== "Unknown" && subject) {
				return `Extracted grant details from organization ${organization}: ${subject.slice(0, 60)}...`;
			}
			if (subject) {
				return `Extracted grant details: ${subject.slice(0, 60)}...`;
			}
			return "Successfully extracted grant application details";
		}
		case "grant_template_created": {
			const sections = data.sections as number;
			const organization = data.organization as string;
			return `Created template with ${sections} sections for ${organization && organization !== "Unknown" ? organization : "grant application"}`;
		}
		case "metadata_generated": {
			const sections = data.sections as number;
			return `Generated metadata for ${sections} sections`;
		}
		case "sections_extracted": {
			const categories = data.categories_found as number;
			const sentences = data.total_sentences as number;
			return `Extracted ${categories} sections with ${sentences} requirements`;
		}
		default: {
			return `Processing ${event.replaceAll("_", " ")}`;
		}
	}
}

function shouldDismissToast(event: string, _previousEvent: null | string, toastId: ToastId): boolean {
	if (!toastId) return false;
	const isCompleteEvent = ERROR_EVENTS.has(event as NotificationEvent);
	return isCompleteEvent;
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

function showSuccessToast(message: string, event: string, _type: string): void {
	const isCompletion = event.includes("completed");
	const prefix = isCompletion ? "✅ Completed: " : "✓ ";
	toast.success(`${prefix}${message}`, {
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
