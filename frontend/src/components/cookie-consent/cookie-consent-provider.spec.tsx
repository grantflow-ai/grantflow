import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { vi } from "vitest";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { CookieConsentProvider } from "./cookie-consent-provider";

vi.mock("@/hooks/use-cookie-consent");

vi.mock("./cookie-consent-modal", () => ({
	CookieConsentModal: vi.fn(({ onAcceptAll, onCustomize, show }) => (
		<div data-testid="cookie-consent-modal" style={{ display: show ? "block" : "none" }}>
			<button data-testid="accept-all-button" onClick={onAcceptAll} type="button">
				Accept All
			</button>
			<button data-testid="customize-button" onClick={onCustomize} type="button">
				Customize
			</button>
		</div>
	)),
}));

vi.mock("./cookie-preferences-modal", () => ({
	CookiePreferencesModal: vi.fn(({ onCancel, onSavePreferences, show }) => (
		<div data-testid="cookie-preferences-modal" style={{ display: show ? "block" : "none" }}>
			<button data-testid="cancel-button" onClick={onCancel} type="button">
				Cancel
			</button>
			<button
				data-testid="save-analytics-enabled"
				onClick={() => onSavePreferences({ analytics: true })}
				type="button"
			>
				Save Analytics Enabled
			</button>
			<button
				data-testid="save-analytics-disabled"
				onClick={() => onSavePreferences({ analytics: false })}
				type="button"
			>
				Save Analytics Disabled
			</button>
		</div>
	)),
}));

const mockUseCookieConsent = vi.mocked(useCookieConsent);

describe("CookieConsentProvider", () => {
	const mockSaveConsent = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Initial Rendering & Hydration Logic", () => {
		it("should render without crashing", () => {
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: false,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			expect(screen.getByTestId("cookie-consent-modal")).toBeInTheDocument();
			expect(screen.getByTestId("cookie-preferences-modal")).toBeInTheDocument();
		});

		it("should initially show no modals before hydration", () => {
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: false,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			const consentModal = screen.getByTestId("cookie-consent-modal");
			const preferencesModal = screen.getByTestId("cookie-preferences-modal");

			expect(consentModal).toHaveStyle({ display: "none" });
			expect(preferencesModal).toHaveStyle({ display: "none" });
		});

		it("should show consent modal after hydration when user hasn't interacted", async () => {
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			await waitFor(() => {
				const consentModal = screen.getByTestId("cookie-consent-modal");
				expect(consentModal).toHaveStyle({ display: "block" });
			});
		});

		it("should not show consent modal after hydration when user has already interacted", () => {
			mockUseCookieConsent.mockReturnValue({
				consentData: {
					consentGiven: true,
					hasInteracted: true,
					preferences: { analytics: true, essential: true },
				},
				hasConsent: true,
				hasInteracted: true,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			const consentModal = screen.getByTestId("cookie-consent-modal");
			const preferencesModal = screen.getByTestId("cookie-preferences-modal");

			expect(consentModal).toHaveStyle({ display: "none" });
			expect(preferencesModal).toHaveStyle({ display: "none" });
		});
	});

	describe("Modal Visibility State Management", () => {
		it("should ensure only consent modal shows initially for new users", async () => {
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			await waitFor(() => {
				const consentModal = screen.getByTestId("cookie-consent-modal");
				const preferencesModal = screen.getByTestId("cookie-preferences-modal");

				expect(consentModal).toHaveStyle({ display: "block" });
				expect(preferencesModal).toHaveStyle({ display: "none" });
			});
		});
	});

	describe("Accept All Flow", () => {
		it("should call saveConsent with correct data and hide consent modal", async () => {
			const user = userEvent.setup();
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			await waitFor(() => {
				expect(screen.getByTestId("cookie-consent-modal")).toHaveStyle({ display: "block" });
			});

			const acceptButton = screen.getByTestId("accept-all-button");
			await user.click(acceptButton);

			expect(mockSaveConsent).toHaveBeenCalledWith({
				consentGiven: true,
				hasInteracted: true,
				preferences: {
					analytics: true,
					essential: true,
				},
			});

			const consentModal = screen.getByTestId("cookie-consent-modal");
			expect(consentModal).toHaveStyle({ display: "none" });
		});

		it("should not show preferences modal after accepting all", async () => {
			const user = userEvent.setup();
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			await waitFor(() => {
				expect(screen.getByTestId("cookie-consent-modal")).toHaveStyle({ display: "block" });
			});

			const acceptButton = screen.getByTestId("accept-all-button");
			await user.click(acceptButton);

			const preferencesModal = screen.getByTestId("cookie-preferences-modal");
			expect(preferencesModal).toHaveStyle({ display: "none" });
		});
	});

	describe("Customize Flow", () => {
		it("should hide consent modal and show preferences modal", async () => {
			const user = userEvent.setup();
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			await waitFor(() => {
				expect(screen.getByTestId("cookie-consent-modal")).toHaveStyle({ display: "block" });
			});

			const customizeButton = screen.getByTestId("customize-button");
			await user.click(customizeButton);

			const consentModal = screen.getByTestId("cookie-consent-modal");
			const preferencesModal = screen.getByTestId("cookie-preferences-modal");

			expect(consentModal).toHaveStyle({ display: "none" });
			expect(preferencesModal).toHaveStyle({ display: "block" });
		});

		it("should not call saveConsent when customizing", async () => {
			const user = userEvent.setup();
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			await waitFor(() => {
				expect(screen.getByTestId("cookie-consent-modal")).toHaveStyle({ display: "block" });
			});

			const customizeButton = screen.getByTestId("customize-button");
			await user.click(customizeButton);

			expect(mockSaveConsent).not.toHaveBeenCalled();
		});
	});

	describe("Save Preferences Flow", () => {
		beforeEach(async () => {
			const user = userEvent.setup();
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			await waitFor(() => {
				expect(screen.getByTestId("cookie-consent-modal")).toHaveStyle({ display: "block" });
			});

			// Navigate to preferences modal
			const customizeButton = screen.getByTestId("customize-button");
			await user.click(customizeButton);

			await waitFor(() => {
				expect(screen.getByTestId("cookie-preferences-modal")).toHaveStyle({ display: "block" });
			});
		});

		it("should save preferences with analytics enabled", async () => {
			const user = userEvent.setup();

			const saveAnalyticsEnabled = screen.getByTestId("save-analytics-enabled");
			await user.click(saveAnalyticsEnabled);

			expect(mockSaveConsent).toHaveBeenCalledWith({
				consentGiven: true,
				hasInteracted: true,
				preferences: {
					analytics: true,
					essential: true,
				},
			});

			const preferencesModal = screen.getByTestId("cookie-preferences-modal");
			expect(preferencesModal).toHaveStyle({ display: "none" });
		});

		it("should save preferences with analytics disabled", async () => {
			const user = userEvent.setup();

			const saveAnalyticsDisabled = screen.getByTestId("save-analytics-disabled");
			await user.click(saveAnalyticsDisabled);

			expect(mockSaveConsent).toHaveBeenCalledWith({
				consentGiven: true,
				hasInteracted: true,
				preferences: {
					analytics: false,
					essential: true,
				},
			});

			const preferencesModal = screen.getByTestId("cookie-preferences-modal");
			expect(preferencesModal).toHaveStyle({ display: "none" });
		});

		it("should always set essential to true regardless of input", async () => {
			const user = userEvent.setup();

			const saveAnalyticsDisabled = screen.getByTestId("save-analytics-disabled");
			await user.click(saveAnalyticsDisabled);

			expect(mockSaveConsent).toHaveBeenCalledWith(
				expect.objectContaining({
					preferences: expect.objectContaining({
						essential: true,
					}),
				}),
			);
		});
	});

	describe("Cancel Preferences Flow", () => {
		it("should hide preferences modal and show consent modal", async () => {
			const user = userEvent.setup();
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			// Navigate to preferences modal
			await waitFor(() => {
				expect(screen.getByTestId("cookie-consent-modal")).toHaveStyle({ display: "block" });
			});

			const customizeButton = screen.getByTestId("customize-button");
			await user.click(customizeButton);

			await waitFor(() => {
				expect(screen.getByTestId("cookie-preferences-modal")).toHaveStyle({ display: "block" });
			});

			// Cancel preferences
			const cancelButton = screen.getByTestId("cancel-button");
			await user.click(cancelButton);

			const consentModal = screen.getByTestId("cookie-consent-modal");
			const preferencesModal = screen.getByTestId("cookie-preferences-modal");

			expect(consentModal).toHaveStyle({ display: "block" });
			expect(preferencesModal).toHaveStyle({ display: "none" });
		});

		it("should not call saveConsent when canceling preferences", async () => {
			const user = userEvent.setup();
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			// Navigate to preferences modal
			await waitFor(() => {
				expect(screen.getByTestId("cookie-consent-modal")).toHaveStyle({ display: "block" });
			});

			const customizeButton = screen.getByTestId("customize-button");
			await user.click(customizeButton);

			await waitFor(() => {
				expect(screen.getByTestId("cookie-preferences-modal")).toHaveStyle({ display: "block" });
			});

			// Reset mock calls from navigation
			mockSaveConsent.mockClear();

			// Cancel preferences
			const cancelButton = screen.getByTestId("cancel-button");
			await user.click(cancelButton);

			expect(mockSaveConsent).not.toHaveBeenCalled();
		});
	});

	describe("Edge Cases & Error Scenarios", () => {
		it("should handle rapid state changes correctly", async () => {
			const user = userEvent.setup();
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			await waitFor(() => {
				expect(screen.getByTestId("cookie-consent-modal")).toHaveStyle({ display: "block" });
			});

			// Rapid clicks on customize and accept
			const customizeButton = screen.getByTestId("customize-button");
			const acceptButton = screen.getByTestId("accept-all-button");

			await user.click(customizeButton);
			await user.click(acceptButton);

			// Should still work correctly - accept should take precedence
			expect(mockSaveConsent).toHaveBeenCalledWith({
				consentGiven: true,
				hasInteracted: true,
				preferences: {
					analytics: true,
					essential: true,
				},
			});
		});

		it("should handle multiple saveConsent calls gracefully", async () => {
			const user = userEvent.setup();
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			});

			render(<CookieConsentProvider />);

			await waitFor(() => {
				expect(screen.getByTestId("cookie-consent-modal")).toHaveStyle({ display: "block" });
			});

			const acceptButton = screen.getByTestId("accept-all-button");

			// Multiple rapid clicks
			await user.click(acceptButton);
			await user.click(acceptButton);
			await user.click(acceptButton);

			// Should handle multiple calls without issues
			expect(mockSaveConsent).toHaveBeenCalledTimes(3);
		});

		it("should handle undefined hook values gracefully", () => {
			mockUseCookieConsent.mockReturnValue({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: false,
				saveConsent: mockSaveConsent,
			});

			expect(() => render(<CookieConsentProvider />)).not.toThrow();
		});
	});

	describe("Hook Integration", () => {
		it("should correctly use all hook values", () => {
			const mockHookReturn = {
				consentData: {
					consentGiven: true,
					hasInteracted: true,
					preferences: { analytics: true, essential: true },
				},
				hasConsent: true,
				hasInteracted: true,
				isHydrated: true,
				saveConsent: mockSaveConsent,
			};

			mockUseCookieConsent.mockReturnValue(mockHookReturn);

			render(<CookieConsentProvider />);

			// Verify hook was called
			expect(mockUseCookieConsent).toHaveBeenCalledTimes(1);
		});
	});
});
