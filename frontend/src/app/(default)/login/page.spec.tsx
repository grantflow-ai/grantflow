import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { vi } from "vitest";

import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { routes } from "@/utils/navigation";

import LoginPage from "./page";

const mockSendSignInLinkToEmail = vi.hoisted(() => vi.fn());
const mockHandleGoogleLogin = vi.hoisted(() => vi.fn());
const mockHandleOrcidLogin = vi.hoisted(() => vi.fn());

vi.mock("firebase/auth", () => ({
	getAuth: vi.fn(),
	sendSignInLinkToEmail: (...args: unknown[]) => mockSendSignInLinkToEmail(...args),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

vi.mock("@/utils/env", () => ({
	getEnv: () => ({
		NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
	}),
}));

vi.mock("@/utils/firebase", () => ({
	getFirebaseAuth: vi.fn(() => ({})),
}));

vi.mock("@/utils/auth-providers", () => ({
	handleGoogleLogin: (...args: unknown[]) => mockHandleGoogleLogin(...args),
	handleOrcidLogin: (...args: unknown[]) => mockHandleOrcidLogin(...args),
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

vi.mock("@/components/ui/toast", () => ({
	useToast: () => ({
		toast: vi.fn(),
	}),
}));

const mockUseCookieConsent = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-cookie-consent", () => ({
	useCookieConsent: mockUseCookieConsent,
}));

describe.sequential("Login Page", () => {
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

	it("renders all login page elements correctly with initial state", () => {
		render(<LoginPage />);
		expect(screen.getByTestId("login-page")).toBeInTheDocument();
		expect(screen.getByTestId("login-background-gradient")).toBeInTheDocument();

		expect(screen.getByTestId("login-header")).toBeInTheDocument();
		expect(screen.getByTestId("login-logo")).toBeInTheDocument();

		const loginCard = screen.getByTestId("login-card");
		expect(loginCard).toBeInTheDocument();
		expect(loginCard).toHaveTextContent("Welcome back!");
		expect(loginCard).toHaveTextContent("Log in to manage your grant workflow");

		const loginForm = screen.getByTestId("login-form");
		expect(loginForm).toBeInTheDocument();

		const emailInput = screen.getByTestId("login-form-email-input");
		expect(emailInput).toBeInTheDocument();
		expect(emailInput).toHaveAttribute("placeholder", "name@example.com");

		const continueButton = screen.getByTestId("login-form-submit-button");
		expect(continueButton).toBeInTheDocument();
		expect(continueButton).toBeDisabled();

		const googleButton = screen.getByTestId("login-google-button");
		const orcidButton = screen.getByTestId("login-orcid-button");
		expect(googleButton).toBeInTheDocument();
		expect(orcidButton).toBeInTheDocument();
		expect(googleButton).toBeEnabled();
		expect(orcidButton).toBeEnabled();

		const createAccountContainer = screen.getByTestId("login-create-account-container");
		expect(createAccountContainer).toHaveTextContent("Don't have an account yet?");

		const createAccountLink = screen.getByTestId("login-create-account-link");
		expect(createAccountLink).toBeInTheDocument();

		const buttonLink = screen.getByTestId("login-create-account-button-link");
		expect(buttonLink).toHaveAttribute("href", routes.onboarding());
	});

	describe.sequential("Email Sign-in Flow", () => {
		const testEmail = "test@example.com";
		let emailInput: HTMLElement;
		let submitButton: HTMLElement;

		beforeEach(() => {
			vi.clearAllMocks();
			mockUseCookieConsent.mockReturnValue({
				hasConsent: true,
				isHydrated: true,
			});
			render(<LoginPage />);

			emailInput = screen.getByTestId("login-form-email-input");
			submitButton = screen.getByTestId("login-form-submit-button");
		});

		it("disables submit button when email is empty or invalid", async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			expect(submitButton).toBeDisabled();

			await user.type(emailInput, "invalid-email");
			await user.tab();

			await waitFor(() => {
				expect(submitButton).toBeDisabled();
			});

			await user.clear(emailInput);
			await user.tab();

			await waitFor(() => {
				expect(submitButton).toBeDisabled();
			});
		});

		it("enables submit button when email is valid", async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			await user.type(emailInput, testEmail);
			await user.tab();

			await waitFor(() => {
				expect(submitButton).toBeEnabled();
			});
		});

		it("handles successful email sign-in flow", async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			let resolvePromise: (() => void) | undefined;
			const deferred = new Promise<void>((resolve) => {
				resolvePromise = resolve;
			});
			mockSendSignInLinkToEmail.mockReturnValueOnce(deferred);

			await user.type(emailInput, testEmail);
			await user.tab();

			await waitFor(() => {
				expect(submitButton).toBeEnabled();
			});

			await user.click(submitButton);

			await waitFor(() => {
				expect(submitButton).toBeDisabled();
			});

			resolvePromise?.();
			await deferred;

			await waitFor(() => {
				expect(mockSendSignInLinkToEmail).toHaveBeenCalledWith(expect.anything(), testEmail, {
					handleCodeInApp: true,
					url: expect.stringContaining("/onboarding/email"),
				});
			});

			expect(localStorage.setItem).toHaveBeenCalledWith(FIREBASE_LOCAL_STORAGE_KEY, testEmail);

			const { toast } = await import("sonner");
			expect(toast.success).toHaveBeenCalledWith(
				"An email has been sent to your mailbox with a sign-in link.\n\nPlease check your inbox.",
			);
		});

		it("handles email sign-in error", async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			let rejectPromise: ((err: unknown) => void) | undefined;
			const deferred = new Promise<void>((_resolve, reject) => {
				rejectPromise = reject;
			});
			const errorMessage = "Failed to send sign-in email";
			mockSendSignInLinkToEmail.mockReturnValueOnce(deferred);

			await user.type(emailInput, testEmail);
			await user.tab();

			await waitFor(() => {
				expect(submitButton).toBeEnabled();
			});

			await user.click(submitButton);

			await waitFor(() => {
				expect(submitButton).toBeDisabled();
			});

			rejectPromise?.(new Error(errorMessage));

			await waitFor(() => {
				expect(mockSendSignInLinkToEmail).toHaveBeenCalledWith(expect.anything(), testEmail, {
					handleCodeInApp: true,
					url: expect.stringContaining("/onboarding/email"),
				});
			});

			const { toast } = await import("sonner");
			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
			});
		});
	});

	describe.sequential("Cookie Consent Integration", () => {
		it("enables social signin buttons and login form when consent is given", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: true,
				isHydrated: true,
			});

			render(<LoginPage />);

			const googleButton = screen.getByTestId("login-google-button");
			const orcidButton = screen.getByTestId("login-orcid-button");

			expect(googleButton).not.toBeDisabled();
			expect(orcidButton).not.toBeDisabled();
		});

		it("disables social signin buttons when consent is not given", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: false,
				isHydrated: true,
			});

			render(<LoginPage />);

			const googleButton = screen.getByTestId("login-google-button");
			const orcidButton = screen.getByTestId("login-orcid-button");

			expect(googleButton).toBeDisabled();
			expect(orcidButton).toBeDisabled();
		});

		it("disables login form submit button when consent is not given", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: false,
				isHydrated: true,
			});

			render(<LoginPage />);

			const submitButton = screen.getByTestId("login-form-submit-button");

			expect(submitButton).toBeDisabled();
		});

		it("keeps login form submit button disabled when consent is given but email is empty", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: true,
				isHydrated: true,
			});

			render(<LoginPage />);

			const submitButton = screen.getByTestId("login-form-submit-button");

			expect(submitButton).toBeDisabled();
		});

		it("passes correct hasConsent prop to LoginForm component", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: false,
				isHydrated: true,
			});

			render(<LoginPage />);

			const loginForm = screen.getByTestId("login-form");
			expect(loginForm).toBeInTheDocument();

			const submitButton = screen.getByTestId("login-form-submit-button");
			expect(submitButton).toBeDisabled();
		});

		it("shows correct disabled state when consent changes", () => {
			const { rerender } = render(<LoginPage />);

			let googleButton = screen.getByTestId("login-google-button");
			let orcidButton = screen.getByTestId("login-orcid-button");
			expect(googleButton).not.toBeDisabled();
			expect(orcidButton).not.toBeDisabled();

			mockUseCookieConsent.mockReturnValue({
				hasConsent: false,
				isHydrated: true,
			});

			rerender(<LoginPage />);

			googleButton = screen.getByTestId("login-google-button");
			orcidButton = screen.getByTestId("login-orcid-button");
			expect(googleButton).toBeDisabled();
			expect(orcidButton).toBeDisabled();
		});

		it("verifies SocialSigninButton receives correct isDisabled prop value", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: false,
				isHydrated: true,
			});

			render(<LoginPage />);

			const googleButton = screen.getByTestId("login-google-button");
			const orcidButton = screen.getByTestId("login-orcid-button");

			expect(googleButton).toBeDisabled();
			expect(orcidButton).toBeDisabled();
		});

		it("verifies LoginForm submit button considers consent in disabled state", () => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: false,
				isHydrated: true,
			});

			render(<LoginPage />);

			const submitButton = screen.getByTestId("login-form-submit-button");

			expect(submitButton).toBeDisabled();
		});
	});
});
