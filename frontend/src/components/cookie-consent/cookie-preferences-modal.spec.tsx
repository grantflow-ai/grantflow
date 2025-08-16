import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useCookieConsentStore } from "@/stores/cookie-consent-store";
import { CookiePreferencesModal } from "./cookie-preferences-modal";

describe("CookiePreferencesModal", () => {
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
	});

	it("should not render when showPreferencesModal is false", () => {
		render(<CookiePreferencesModal />);

		expect(screen.queryByTestId("cookie-preferences-modal")).not.toBeInTheDocument();
	});

	it("should render when showPreferencesModal is true", () => {
		useCookieConsentStore.setState({ showPreferencesModal: true });

		render(<CookiePreferencesModal />);

		expect(screen.getByTestId("cookie-preferences-modal")).toBeInTheDocument();
		expect(screen.getByText("Cookie Preferences")).toBeInTheDocument();
		expect(screen.getByTestId("cookie-preferences-save")).toBeInTheDocument();
		expect(screen.getByTestId("cookie-preferences-accept-all")).toBeInTheDocument();
	});

	it("should show essential cookies as always enabled and disabled", () => {
		useCookieConsentStore.setState({ showPreferencesModal: true });

		render(<CookiePreferencesModal />);

		const essentialSwitch = screen.getByTestId("essential-cookies-switch");
		expect(essentialSwitch).toBeDisabled();
		expect(essentialSwitch).toHaveAttribute("aria-checked", "true");
	});

	it("should allow toggling analytics cookies", async () => {
		const user = userEvent.setup();
		useCookieConsentStore.setState({ showPreferencesModal: true });

		render(<CookiePreferencesModal />);

		const analyticsSwitch = screen.getByTestId("analytics-cookies-switch");
		expect(analyticsSwitch).toHaveAttribute("aria-checked", "false");

		await user.click(analyticsSwitch);
		expect(analyticsSwitch).toHaveAttribute("aria-checked", "true");

		await user.click(analyticsSwitch);
		expect(analyticsSwitch).toHaveAttribute("aria-checked", "false");
	});

	it("should save preferences when Save button is clicked", async () => {
		const user = userEvent.setup();
		useCookieConsentStore.setState({
			preferences: { analytics: false, essential: true },
			showPreferencesModal: true,
		});

		render(<CookiePreferencesModal />);

		const analyticsSwitch = screen.getByTestId("analytics-cookies-switch");
		await user.click(analyticsSwitch);
		await user.click(screen.getByTestId("cookie-preferences-save"));

		await waitFor(() => {
			const state = useCookieConsentStore.getState();
			expect(state.preferences.analytics).toBe(true);
			expect(state.consentGiven).toBe(true);
			expect(state.showPreferencesModal).toBe(false);
			expect(state.hasInteracted).toBe(true);
		});
	});

	it("should accept all cookies when Accept All button is clicked", async () => {
		const user = userEvent.setup();
		useCookieConsentStore.setState({ showPreferencesModal: true });

		render(<CookiePreferencesModal />);

		await user.click(screen.getByTestId("cookie-preferences-accept-all"));

		await waitFor(() => {
			const state = useCookieConsentStore.getState();
			expect(state.preferences.analytics).toBe(true);
			expect(state.consentGiven).toBe(true);
			expect(state.showPreferencesModal).toBe(false);
			expect(state.hasInteracted).toBe(true);
		});
	});

	it("should go back to consent modal when Back button is clicked", async () => {
		const user = userEvent.setup();
		useCookieConsentStore.setState({ showPreferencesModal: true });

		render(<CookiePreferencesModal />);

		await user.click(screen.getByTestId("cookie-preferences-back"));

		await waitFor(() => {
			const state = useCookieConsentStore.getState();
			expect(state.showPreferencesModal).toBe(false);
			expect(state.showConsentModal).toBe(true);
		});
	});

	it("should display cookie type descriptions", () => {
		useCookieConsentStore.setState({ showPreferencesModal: true });

		render(<CookiePreferencesModal />);

		expect(screen.getByText(/required for basic site functionality/i)).toBeInTheDocument();
		expect(screen.getByText(/help us understand how visitors interact/i)).toBeInTheDocument();
	});

	it("should render privacy policy link", () => {
		useCookieConsentStore.setState({ showPreferencesModal: true });

		render(<CookiePreferencesModal />);

		const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
		expect(privacyLink).toHaveAttribute("href", "/privacy");
		expect(privacyLink).toHaveAttribute("target", "_blank");
	});
});
