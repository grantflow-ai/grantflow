"use client";

import { CookieConsentModal } from "./cookie-consent-modal";
import { CookiePreferencesModal } from "./cookie-preferences-modal";

export function CookieConsentProvider() {
	return (
		<>
			<CookieConsentModal />
			<CookiePreferencesModal />
		</>
	);
}

export { CookieConsentTrigger } from "./cookie-consent-trigger";
