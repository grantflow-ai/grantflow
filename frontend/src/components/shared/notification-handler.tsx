"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { RagProcessingStatusMessage } from "@/hooks/use-application-notifications";
import { ERROR_EVENTS, type NotificationEvent, SUCCESS_EVENTS, WARNING_EVENTS } from "@/types/notification-events";

interface NotificationHandlerProps {
	notification: RagProcessingStatusMessage;
}

type ToastId = number | string | undefined;

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
