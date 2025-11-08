import { log } from "@/utils/logger/client";
import { getAnalytics } from "@/utils/segment";
import { TrackingEvents } from "./events";
import { trackGA4Event } from "./ga4";
import { getSessionId } from "./session";
import type { EventProperties, TrackableEvent } from "./types";

export async function trackError(
	errorType: "api" | "auth" | "generation",
	properties: {
		[key: string]: unknown;
		errorMessage: string;
	},
): Promise<void> {
	switch (errorType) {
		case "api": {
			await trackEvent(TrackingEvents.ERROR_API_CRITICAL, {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				endpoint: (properties.endpoint as string) ?? "unknown",
				errorMessage: properties.errorMessage,
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				statusCode: (properties.statusCode as number) ?? 500,
			});

			break;
		}
		case "auth": {
			await trackEvent(TrackingEvents.ERROR_AUTH_FAILED, {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				reason: (properties.reason as string) ?? properties.errorMessage,
			});

			break;
		}
		case "generation": {
			await trackEvent(TrackingEvents.ERROR_GENERATION_FAILED, {
				errorMessage: properties.errorMessage,
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				generationType: (properties.generationType as "application" | "template") ?? "application",
			});

			break;
		}
	}
}

export async function trackEvent<T extends TrackableEvent>(
	event: T,
	properties: Omit<EventProperties[T], "path" | "sessionId" | "timestamp">,
): Promise<void> {
	try {
		const fullProperties = {
			...properties,
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			path: typeof globalThis.window === "undefined" ? undefined : globalThis.window?.location?.pathname,

			referrer: typeof document === "undefined" ? undefined : document.referrer,
			sessionId: getSessionId(),
			timestamp: new Date().toISOString(),
		};

		const analyticsInstance = getAnalytics();
		if (analyticsInstance) {
			await analyticsInstance.track(event, fullProperties);
		} else {
			log.warn("Segment analytics not initialized", { event });
		}

		await trackGA4Event(event, fullProperties);

		log.info("Analytics event tracked", { event, properties: fullProperties });
	} catch (error) {
		log.error("Failed to track analytics event", { error, event, properties });
	}
}

export async function trackPageView(pageName: string, properties: Record<string, unknown> = {}): Promise<void> {
	const pageViewEvents: Record<string, TrackableEvent> = {
		application: TrackingEvents.PAGE_VIEW_APPLICATION,
		dashboard: TrackingEvents.PAGE_VIEW_DASHBOARD,
		editor: TrackingEvents.PAGE_VIEW_EDITOR,
		login: TrackingEvents.PAGE_VIEW_LOGIN,
		project: TrackingEvents.PAGE_VIEW_PROJECT,
		signup: TrackingEvents.PAGE_VIEW_SIGNUP,
	};

	const event = pageViewEvents[pageName];
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!event) {
		log.warn("Unknown page view", { pageName });
		return;
	}

	await trackEvent(event, properties);
}
