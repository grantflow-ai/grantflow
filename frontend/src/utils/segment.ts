import { AnalyticsBrowser } from "@segment/analytics-next";
import { log } from "@/utils/logger/client";
import type { TrackableWizardEvent, WizardEventProperties } from "./analytics-events";

export const analytics: { value: AnalyticsBrowser | null } = {
	value: null,
};

export const getAnalytics = () => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, sonarjs/different-types-comparison
	if (!analytics.value && globalThis.window !== undefined) {
		// ~keep the analytics write key is not a secret value. We might pass it via env later.
		analytics.value = AnalyticsBrowser.load({ writeKey: "M5CP7BfkccD2I8k11pFE5qAcFjibdUyn" });
	}

	return analytics.value;
};

export async function analyticsIdentify(
	userId: string,
	traits: {
		email: string;
		firstName: string;
		lastName: string;
	},
) {
	await getAnalytics()?.identify(userId, traits);
}

export async function trackWizardEvent<T extends TrackableWizardEvent>(
	event: T,
	properties: Omit<WizardEventProperties[T], "timestamp">,
): Promise<void> {
	try {
		const analyticsInstance = getAnalytics();
		if (!analyticsInstance) {
			log.warn("Analytics not initialized", { event });
			return;
		}

		const fullProperties = {
			...properties,
			timestamp: new Date().toISOString(),
		};

		await analyticsInstance.track(event, fullProperties);
		log.info("Analytics event tracked", { event, properties: fullProperties });
	} catch (error) {
		log.error("Failed to track analytics event", { error, event, properties });
	}
}
