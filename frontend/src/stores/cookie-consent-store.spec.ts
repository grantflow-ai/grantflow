import { beforeEach, describe, expect, it } from "vitest";
import { useCookieConsentStore } from "./cookie-consent-store";

describe("Cookie Consent Store", () => {
	beforeEach(() => {
		useCookieConsentStore.setState({
			consentGiven: false,
			hasInteracted: false,
			preferences: {
				analytics: false,
				essential: true,
			},
			showConsentModal: false,
			showPreferencesModal: false,
		});
		localStorage.clear();
	});

	describe("acceptAllCookies", () => {
		it("should accept all cookies and set appropriate state", () => {
			const { acceptAllCookies } = useCookieConsentStore.getState();

			acceptAllCookies();

			const state = useCookieConsentStore.getState();
			expect(state.consentGiven).toBe(true);
			expect(state.preferences.essential).toBe(true);
			expect(state.preferences.analytics).toBe(true);
			expect(state.showConsentModal).toBe(false);
			expect(state.showPreferencesModal).toBe(false);
			expect(state.hasInteracted).toBe(true);
		});
	});

	describe("updatePreferences", () => {
		it("should update analytics preference while keeping essential always true", () => {
			const { updatePreferences } = useCookieConsentStore.getState();

			updatePreferences({ analytics: true });

			const state = useCookieConsentStore.getState();
			expect(state.preferences.essential).toBe(true);
			expect(state.preferences.analytics).toBe(true);
			expect(state.consentGiven).toBe(true);
			expect(state.hasInteracted).toBe(true);
		});

		it("should not allow disabling essential cookies", () => {
			const { updatePreferences } = useCookieConsentStore.getState();

			updatePreferences({ analytics: false, essential: false });

			const state = useCookieConsentStore.getState();
			expect(state.preferences.essential).toBe(true);
			expect(state.preferences.analytics).toBe(false);
		});
	});

	describe("modal management", () => {
		it("should open preferences modal and close consent modal", () => {
			useCookieConsentStore.setState({ showConsentModal: true });
			const { openPreferencesModal } = useCookieConsentStore.getState();

			openPreferencesModal();

			const state = useCookieConsentStore.getState();
			expect(state.showPreferencesModal).toBe(true);
			expect(state.showConsentModal).toBe(false);
		});

		it("should close preferences modal", () => {
			useCookieConsentStore.setState({ showPreferencesModal: true });
			const { closePreferencesModal } = useCookieConsentStore.getState();

			closePreferencesModal();

			const state = useCookieConsentStore.getState();
			expect(state.showPreferencesModal).toBe(false);
		});

		it("should open consent modal only if user has not interacted", () => {
			const { openConsentModal } = useCookieConsentStore.getState();

			openConsentModal();

			let state = useCookieConsentStore.getState();
			expect(state.showConsentModal).toBe(true);

			useCookieConsentStore.setState({ hasInteracted: true, showConsentModal: false });
			openConsentModal();

			state = useCookieConsentStore.getState();
			expect(state.showConsentModal).toBe(false);
		});
	});

	describe("checkAndShowConsent", () => {
		it("should show consent modal if user has not interacted", () => {
			const { checkAndShowConsent } = useCookieConsentStore.getState();

			checkAndShowConsent();

			const state = useCookieConsentStore.getState();
			expect(state.showConsentModal).toBe(true);
		});

		it("should not show consent modal if user has already interacted", () => {
			useCookieConsentStore.setState({ hasInteracted: true });
			const { checkAndShowConsent } = useCookieConsentStore.getState();

			checkAndShowConsent();

			const state = useCookieConsentStore.getState();
			expect(state.showConsentModal).toBe(false);
		});
	});

	describe("resetConsent", () => {
		it("should reset all consent data to initial state", () => {
			useCookieConsentStore.setState({
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
				showConsentModal: true,
				showPreferencesModal: true,
			});

			const { resetConsent } = useCookieConsentStore.getState();
			resetConsent();

			const state = useCookieConsentStore.getState();
			expect(state.consentGiven).toBe(false);
			expect(state.showConsentModal).toBe(false);
			expect(state.showPreferencesModal).toBe(false);
			expect(state.preferences.essential).toBe(true);
			expect(state.preferences.analytics).toBe(false);
			expect(state.hasInteracted).toBe(false);
		});
	});

	describe("persistence", () => {
		it("should persist consent state to localStorage", () => {
			const { acceptAllCookies } = useCookieConsentStore.getState();

			acceptAllCookies();

			const stored = localStorage.getItem("cookie-consent");
			expect(stored).toBeDefined();

			const parsed = JSON.parse(stored ?? "{}");
			expect(parsed.state.consentGiven).toBe(true);
			expect(parsed.state.preferences.analytics).toBe(true);
			expect(parsed.state.hasInteracted).toBe(true);
		});
	});
});
