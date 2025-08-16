import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CookiePreferences {
	analytics: boolean;
	essential: boolean;
}

interface CookieConsentActions {
	acceptAllCookies: () => void;
	checkAndShowConsent: () => void;
	closeConsentModal: () => void;
	closePreferencesModal: () => void;
	openConsentModal: () => void;
	openPreferencesModal: () => void;
	resetConsent: () => void;
	updatePreferences: (preferences: Partial<CookiePreferences>) => void;
}

interface CookieConsentState {
	consentGiven: boolean;
	hasInteracted: boolean;
	preferences: CookiePreferences;
	showConsentModal: boolean;
	showPreferencesModal: boolean;
}

export const useCookieConsentStore = create<CookieConsentActions & CookieConsentState>()(
	persist(
		(set, get) => ({
			acceptAllCookies: () => {
				set({
					consentGiven: true,
					hasInteracted: true,
					preferences: {
						analytics: true,
						essential: true,
					},
					showConsentModal: false,
					showPreferencesModal: false,
				});
			},
			checkAndShowConsent: () => {
				const { hasInteracted } = get();
				if (!hasInteracted) {
					set({ showConsentModal: true });
				}
			},
			closeConsentModal: () => {
				set({ showConsentModal: false });
			},
			closePreferencesModal: () => {
				set({ showPreferencesModal: false });
			},
			consentGiven: false,

			hasInteracted: false,

			openConsentModal: () => {
				const { hasInteracted } = get();
				if (!hasInteracted) {
					set({ showConsentModal: true });
				}
			},

			openPreferencesModal: () => {
				set({
					showConsentModal: false,
					showPreferencesModal: true,
				});
			},

			preferences: {
				analytics: false,
				essential: true,
			},

			resetConsent: () => {
				set({
					consentGiven: false,
					hasInteracted: false,
					preferences: {
						analytics: false,
						essential: true,
					},
					showConsentModal: false,
					showPreferencesModal: false,
				});
			},

			showConsentModal: false,

			showPreferencesModal: false,

			updatePreferences: (newPreferences) => {
				const currentPreferences = get().preferences;
				set({
					consentGiven: true,
					hasInteracted: true,
					preferences: {
						...currentPreferences,
						...newPreferences,
						essential: true,
					},
					showConsentModal: false,
					showPreferencesModal: false,
				});
			},
		}),
		{
			name: "cookie-consent",
			partialize: (state) => ({
				consentGiven: state.consentGiven,
				hasInteracted: state.hasInteracted,
				preferences: state.preferences,
			}),
		},
	),
);
