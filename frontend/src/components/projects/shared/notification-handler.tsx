"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { RagProcessingStatusMessage } from "@/hooks/use-application-notifications";

type ToastId = number | string | undefined;

const ERROR_EVENTS = new Set([
	"generation_error",
	"indexing_failed",
	"internal_error",
	"missing_prerequisites",
	"pipeline_error",
	"template_incomplete",
]);

const WARNING_EVENTS = new Set(["indexing_timeout", "insufficient_context_error", "low_retrieval_quality"]);

const SUCCESS_EVENTS = new Set([
	"application_saved",
	"grant_application_generation_completed",
	"grant_template_created",
	"grant_template_generation_completed",
]);

const PROGRESS_EVENTS = new Set([
	"assembling_application",
	"extracting_cfp_data",
	"generating_section_texts",
	"grant_application_generation_started",
	"grant_template_generation_started",
	"restored_progress",
	"saving_application",
	"saving_grant_template",
	"validating_template",
]);

interface NotificationHandlerProps {
	notification: RagProcessingStatusMessage;
}

export function NotificationHandler({ notification }: NotificationHandlerProps) {
	const [toastId, setToastId] = useState<ToastId>();
	const previousEventRef = useRef<null | string>(null);

	useEffect(() => {
		const { event } = notification.data;

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
	const { data, event, message } = notification.data;

	if (PROGRESS_EVENTS.has(event)) {
		showInfoToast(message, data, notification.type);
		return undefined;
	}

	if (ERROR_EVENTS.has(event)) {
		showErrorToast(message, data, notification.type);
	} else if (WARNING_EVENTS.has(event)) {
		showWarningToast(message, data);
	} else if (SUCCESS_EVENTS.has(event)) {
		showSuccessToast(message, event);
	} else {
		showInfoToast(message, data, notification.type);
	}

	return undefined;
}

function shouldDismissToast(event: string, previousEvent: null | string, toastId: ToastId): boolean {
	if (!toastId) return false;
	const isProgressChange = PROGRESS_EVENTS.has(event) && previousEvent !== event;
	const isCompleteEvent = SUCCESS_EVENTS.has(event) || ERROR_EVENTS.has(event);
	return isProgressChange || isCompleteEvent;
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

function showSuccessToast(message: string, event: string): void {
	const isCompletion = event.includes("completed");
	const prefix = isCompletion ? "✅ Completed: " : "✓ ";
	toast.success(`${prefix}${message}`, {
		duration: isCompletion ? 8000 : 5000,
	});
}

function showWarningToast(message: string, data: Record<string, unknown> | undefined): void {
	const description = data?.suggestion as string | undefined;
	toast.warning(`⚠️ ${message}`, {
		description,
		duration: 8000,
	});
}