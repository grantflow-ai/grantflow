import { AnalyticsBrowser } from "@segment/analytics-next";

import { getEnv } from "./env";

export const analytics: { value: AnalyticsBrowser | null } = {
	value: null,
};

export const getAnalytics = () => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, sonarjs/different-types-comparison
	if (!analytics.value && globalThis.window !== undefined) {
		analytics.value = AnalyticsBrowser.load({ writeKey: getEnv().NEXT_PUBLIC_SEGMENT_WRITE_KEY });
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
