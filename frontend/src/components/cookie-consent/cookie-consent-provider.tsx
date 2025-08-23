"use client";

import { useEffect, useState } from "react";
import { type CookieConsentData, useCookieConsent } from "@/hooks/use-cookie-consent";
import { CookieConsentModal } from "./cookie-consent-modal";
import { CookiePreferencesModal } from "./cookie-preferences-modal";

export function CookieConsentProvider() {
	const { hasInteracted, isHydrated, saveConsent } = useCookieConsent();
	const [showConsentModal, setShowConsentModal] = useState(false);
	const [showPreferencesModal, setShowPreferencesModal] = useState(false);

	useEffect(() => {
		if (isHydrated && !hasInteracted) {
			setShowConsentModal(true);
		}
	}, [hasInteracted, isHydrated]);

	const handleAcceptAll = () => {
		const consentData: CookieConsentData = {
			consentGiven: true,
			hasInteracted: true,
			preferences: {
				analytics: true,
				essential: true,
			},
		};

		saveConsent(consentData);
		setShowConsentModal(false);
	};

	const handleCustomize = () => {
		setShowConsentModal(false);
		setShowPreferencesModal(true);
	};

	const handleSavePreferences = (preferences: { analytics: boolean }) => {
		const consentData: CookieConsentData = {
			consentGiven: true,
			hasInteracted: true,
			preferences: {
				analytics: preferences.analytics,
				essential: true,
			},
		};

		saveConsent(consentData);
		setShowPreferencesModal(false);
	};

	const handleCancelPreferences = () => {
		setShowPreferencesModal(false);
		setShowConsentModal(true);
	};

	return (
		<>
			<CookieConsentModal onAcceptAll={handleAcceptAll} onCustomize={handleCustomize} show={showConsentModal} />
			<CookiePreferencesModal
				onCancel={handleCancelPreferences}
				onSavePreferences={handleSavePreferences}
				show={showPreferencesModal}
			/>
		</>
	);
}
