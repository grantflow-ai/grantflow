import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useCookieConsentStore } from "@/stores/cookie-consent-store";
import { CookieConsentModal } from "./cookie-consent-modal";

describe("CookieConsentModal", () => {
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

	it("should not render when showConsentModal is false", () => {
		render(<CookieConsentModal />);

		expect(screen.queryByTestId("cookie-consent-modal")).not.toBeInTheDocument();
	});

	it("should render when showConsentModal is true", () => {
		useCookieConsentStore.setState({ showConsentModal: true });

		render(<CookieConsentModal />);

		expect(screen.getByTestId("cookie-consent-modal")).toBeInTheDocument();
		expect(screen.getByText("Cookie Preferences")).toBeInTheDocument();
		expect(screen.getByTestId("cookie-consent-accept-all")).toBeInTheDocument();
		expect(screen.getByTestId("cookie-consent-customize")).toBeInTheDocument();
	});

	it("should accept all cookies when Accept All button is clicked", async () => {
		const user = userEvent.setup();
		useCookieConsentStore.setState({ showConsentModal: true });

		render(<CookieConsentModal />);

		await user.click(screen.getByTestId("cookie-consent-accept-all"));

		await waitFor(() => {
			const state = useCookieConsentStore.getState();
			expect(state.consentGiven).toBe(true);
			expect(state.preferences.analytics).toBe(true);
			expect(state.showConsentModal).toBe(false);
			expect(state.hasInteracted).toBe(true);
		});
	});

	it("should open preferences modal when Customize button is clicked", async () => {
		const user = userEvent.setup();
		useCookieConsentStore.setState({ showConsentModal: true });

		render(<CookieConsentModal />);

		await user.click(screen.getByTestId("cookie-consent-customize"));

		await waitFor(() => {
			const state = useCookieConsentStore.getState();
			expect(state.showPreferencesModal).toBe(true);
			expect(state.showConsentModal).toBe(false);
		});
	});

	it("should block body scroll when modal is open", () => {
		useCookieConsentStore.setState({ showConsentModal: true });

		render(<CookieConsentModal />);

		expect(document.body.style.overflow).toBe("hidden");
	});

	it("should restore body scroll when modal is closed", () => {
		useCookieConsentStore.setState({ showConsentModal: true });

		const { unmount } = render(<CookieConsentModal />);
		expect(document.body.style.overflow).toBe("hidden");

		unmount();
		expect(document.body.style.overflow).toBe("unset");
	});

	it("should render privacy policy and terms links", () => {
		useCookieConsentStore.setState({ showConsentModal: true });

		render(<CookieConsentModal />);

		const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
		const termsLink = screen.getByRole("link", { name: /terms of service/i });

		expect(privacyLink).toHaveAttribute("href", "/privacy");
		expect(privacyLink).toHaveAttribute("target", "_blank");
		expect(termsLink).toHaveAttribute("href", "/terms");
		expect(termsLink).toHaveAttribute("target", "_blank");
	});

	it("should display essential cookies information", () => {
		useCookieConsentStore.setState({ showConsentModal: true });

		render(<CookieConsentModal />);

		expect(screen.getByText(/essential cookies are always enabled/i)).toBeInTheDocument();
		expect(screen.getByText(/your privacy matters/i)).toBeInTheDocument();
	});
});
