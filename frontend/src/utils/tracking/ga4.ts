"use client";

import { logEvent, setConsent, setUserId, setUserProperties } from "firebase/analytics";
import { getGA4Analytics } from "@/utils/firebase";
import { log } from "@/utils/logger/client";

/**
 * Identify user in Google Analytics 4
 */
export async function identifyGA4User(userId: string, userProperties?: Record<string, string>): Promise<void> {
	try {
		const analytics = await getGA4Analytics();
		if (!analytics) {
			log.warn("GA4 Analytics not available for user identification");
			return;
		}

		setUserId(analytics, userId);

		if (userProperties) {
			setUserProperties(analytics, userProperties);
		}

		log.info("GA4 user identified", { userId, userProperties });
	} catch (error) {
		log.error("Failed to identify GA4 user", { error, userId });
	}
}

/**
 * Track a custom event in Google Analytics 4
 */
export async function trackGA4Event(eventName: string, eventParams?: Record<string, unknown>): Promise<void> {
	try {
		const analytics = await getGA4Analytics();
		if (!analytics) {
			log.warn("GA4 Analytics not available", { eventName });
			return;
		}

		logEvent(analytics, eventName, eventParams);
		log.info("GA4 event tracked", { eventName, eventParams });
	} catch (error) {
		log.error("Failed to track GA4 event", { error, eventName, eventParams });
	}
}

/**
 * Track page view in Google Analytics 4
 */
export async function trackGA4PageView(pagePath: string, pageTitle?: string): Promise<void> {
	await trackGA4Event("page_view", {
		page_path: pagePath,
		page_title: pageTitle ?? document.title,
	});
}

/**
 * Update GA4 consent mode based on user preferences
 */
export async function updateGA4Consent(analyticsConsent: boolean): Promise<void> {
	try {
		const analytics = await getGA4Analytics();
		if (!analytics) {
			return;
		}

		setConsent({
			analytics_storage: analyticsConsent ? "granted" : "denied",
		});

		log.info("GA4 consent updated", { analyticsConsent });
	} catch (error) {
		log.error("Failed to update GA4 consent", { error });
	}
}
