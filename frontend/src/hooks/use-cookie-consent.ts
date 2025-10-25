"use client";

import { useEffect, useState } from "react";
// eslint-disable-next-line import-x/no-unresolved
import { useCookies } from "react-cookie";
import { COOKIE_CONSENT } from "@/constants";

export interface CookieConsentData {
	consentGiven: boolean;
	hasInteracted: boolean;
	preferences?: CookiePreferences;
}

export interface CookiePreferences {
	analytics: boolean;
	essential: boolean;
}

export function useCookieConsent() {
	const [cookies, setCookie] = useCookies([COOKIE_CONSENT]);
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	const consentData = isHydrated ? (cookies[COOKIE_CONSENT] as CookieConsentData | undefined) : undefined;

	const saveConsent = (data: CookieConsentData) => {
		setCookie(COOKIE_CONSENT, data, {
			maxAge: 365 * 24 * 60 * 60,
			path: "/",
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
		});
	};

	return {
		analyticsConsent: isHydrated ? Boolean(consentData?.preferences?.analytics) : false,
		consentData,
		hasConsent: isHydrated ? Boolean(consentData?.consentGiven) : false,
		hasInteracted: isHydrated ? Boolean(consentData?.hasInteracted) : false,
		isHydrated,
		saveConsent,
	};
}
