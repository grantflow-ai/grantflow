"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { trackGA4PageView, updateGA4Consent } from "@/utils/tracking/ga4";

/**
 * Tracks page views in Google Analytics 4 when route changes
 * Respects cookie consent preferences
 */
export function GA4PageViewTracker() {
	return (
		<Suspense fallback={null}>
			<GA4PageViewTrackerInner />
		</Suspense>
	);
}

function GA4PageViewTrackerInner() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { analyticsConsent, isHydrated } = useCookieConsent();

	// Update consent when it changes
	useEffect(() => {
		if (isHydrated) {
			void updateGA4Consent(analyticsConsent);
		}
	}, [analyticsConsent, isHydrated]);

	// Track page views
	useEffect(() => {
		// Only track if user has given consent
		if (!analyticsConsent) {
			return;
		}

		const queryString = searchParams.toString();
		const url = pathname + (queryString ? `?${queryString}` : "");
		void trackGA4PageView(url);
	}, [pathname, searchParams, analyticsConsent]);

	return null;
}
