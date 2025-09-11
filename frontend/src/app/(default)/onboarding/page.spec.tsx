import { cleanup, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import OnboardingPage from "./page";

const mockUseCookieConsent = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-cookie-consent", () => ({
	useCookieConsent: mockUseCookieConsent,
}));

vi.mock("firebase/auth", () => ({
	getAuth: vi.fn(),
	sendSignInLinkToEmail: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("@/utils/env", () => ({
	getEnv: () => ({
		NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
	}),
}));

vi.mock("@/utils/firebase", () => ({
	convertFirebaseUser: vi.fn(),
	getFirebaseAuth: vi.fn(() => ({})),
}));

vi.mock("@/utils/auth-providers", () => ({
	handleGoogleSignup: vi.fn(),
	handleOrcidSignup: vi.fn(),
}));

vi.mock("@/stores/user-store", () => ({
	useUserStore: () => ({
		setUser: vi.fn(),
	}),
}));

vi.mock("@/actions/login", () => ({
	login: vi.fn(),
}));

vi.mock("@/components/cookie-consent/cookie-consent-provider", () => ({
	CookieConsentProvider: () => null,
}));

const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		clear: vi.fn(() => {
			store = {};
		}),
		getItem: vi.fn((key: string) => store[key] || null),
		removeItem: vi.fn((key: string) => {
			store[key] = "";
		}),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
	};
})();

Object.defineProperty(globalThis, "localStorage", {
	value: localStorageMock,
});

describe.sequential("Onboarding Page", () => {
	beforeEach(() => {
		mockUseCookieConsent.mockReturnValue({
			hasConsent: true,
			isHydrated: true,
		});
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("renders onboarding page correctly", () => {
		render(<OnboardingPage />);

		expect(screen.getByTestId("login-container")).toBeInTheDocument();
		expect(screen.getByText("Create your account")).toBeInTheDocument();
		expect(screen.getByText("Get more funding - faster!")).toBeInTheDocument();
	});

	describe.sequential("Cookie Consent Integration", () => {
		it("enables social signin buttons when consent is given", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: true,
				isHydrated: true,
			});

			render(<OnboardingPage />);

			const googleButton = screen.getByRole("button", { name: /google/i });
			const orcidButton = screen.getByRole("button", { name: /orcid/i });

			expect(googleButton).not.toBeDisabled();
			expect(orcidButton).not.toBeDisabled();
		});

		it("disables social signin buttons when consent is not given", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: false,
				isHydrated: true,
			});

			render(<OnboardingPage />);

			const googleButton = screen.getByRole("button", { name: /google/i });
			const orcidButton = screen.getByRole("button", { name: /orcid/i });

			expect(googleButton).toBeDisabled();
			expect(orcidButton).toBeDisabled();
		});

		it("disables signin form when consent is not given", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: false,
				isHydrated: true,
			});

			render(<OnboardingPage />);

			const firstNameInput = screen.getByLabelText(/first name/i);
			const lastNameInput = screen.getByLabelText(/last name/i);
			const emailInput = screen.getByLabelText(/email/i);

			expect(firstNameInput).toBeDisabled();
			expect(lastNameInput).toBeDisabled();
			expect(emailInput).toBeDisabled();
		});

		it("enables signin form when consent is given", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: true,
				isHydrated: true,
			});

			render(<OnboardingPage />);

			const firstNameInput = screen.getByLabelText(/first name/i);
			const lastNameInput = screen.getByLabelText(/last name/i);
			const emailInput = screen.getByLabelText(/email/i);

			expect(firstNameInput).not.toBeDisabled();
			expect(lastNameInput).not.toBeDisabled();
			expect(emailInput).not.toBeDisabled();
		});

		it("verifies SigninForm receives correct isDisabled prop value", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: false,
				isHydrated: true,
			});

			render(<OnboardingPage />);

			const firstNameInput = screen.getByLabelText(/first name/i);
			const lastNameInput = screen.getByLabelText(/last name/i);
			const emailInput = screen.getByLabelText(/email/i);

			expect(firstNameInput).toBeDisabled();
			expect(lastNameInput).toBeDisabled();
			expect(emailInput).toBeDisabled();
		});

		it("verifies SocialSigninButton components receive correct isDisabled prop value", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: false,
				isHydrated: true,
			});

			render(<OnboardingPage />);

			const googleButton = screen.getByRole("button", { name: /google/i });
			const orcidButton = screen.getByRole("button", { name: /orcid/i });

			expect(googleButton).toBeDisabled();
			expect(orcidButton).toBeDisabled();
		});

		it("shows correct disabled state when consent changes", () => {
			const { rerender } = render(<OnboardingPage />);

			let googleButton = screen.getByRole("button", { name: /google/i });
			let orcidButton = screen.getByRole("button", { name: /orcid/i });

			expect(googleButton).not.toBeDisabled();
			expect(orcidButton).not.toBeDisabled();

			mockUseCookieConsent.mockReturnValue({
				hasConsent: false,
				isHydrated: true,
			});

			rerender(<OnboardingPage />);

			googleButton = screen.getByRole("button", { name: /google/i });
			orcidButton = screen.getByRole("button", { name: /orcid/i });

			expect(googleButton).toBeDisabled();
			expect(orcidButton).toBeDisabled();
		});

		it("passes hasConsent value correctly to form and social signin components", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: true,
				isHydrated: true,
			});

			render(<OnboardingPage />);

			const firstNameInput = screen.getByLabelText(/first name/i);
			const lastNameInput = screen.getByLabelText(/last name/i);
			const emailInput = screen.getByLabelText(/email/i);

			expect(firstNameInput).not.toBeDisabled();
			expect(lastNameInput).not.toBeDisabled();
			expect(emailInput).not.toBeDisabled();
		});
	});
});
