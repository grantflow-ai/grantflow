import { AnalyticsBrowser } from "@segment/analytics-next";
import { log } from "@/utils/logger/client";

export const analytics: { value: AnalyticsBrowser | null } = {
	value: null,
};

export const getAnalytics = () => {
	if (!analytics.value && typeof globalThis.window !== "undefined") {
		const writeKey = process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY;
		if (!writeKey) {
			log.warn("Segment write key not configured - analytics disabled");
			return null;
		}
		analytics.value = AnalyticsBrowser.load({ writeKey });
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
	const analyticsInstance = getAnalytics();
	if (analyticsInstance) {
		await analyticsInstance.identify(userId, traits);
	}
}
