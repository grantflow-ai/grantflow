import { AnalyticsBrowser } from "@segment/analytics-next";
import { log } from "@/utils/logger/client";

export const analytics: { value: AnalyticsBrowser | null } = {
	value: null,
};

const getSegmentWriteKey = (): string | undefined => {
	if (process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY) {
		return process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY;
	}

	if (typeof globalThis.window !== "undefined") {
		const { hostname } = globalThis.window.location;

		if (hostname.includes("grantflow.ai") && !hostname.includes("staging")) {
			return process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY_PRODUCTION;
		}

		if (hostname.includes("staging") || hostname.includes("web.app")) {
			return process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY_STAGING;
		}
	}

	return undefined;
};

export const getAnalytics = () => {
	if (!analytics.value && typeof globalThis.window !== "undefined") {
		const writeKey = getSegmentWriteKey();
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
