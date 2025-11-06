import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { User } from "firebase/auth";
import { vi } from "vitest";

import SignupPage from "./page";

const mockUseCookieConsent = vi.hoisted(() => vi.fn());
const mockLogin = vi.hoisted(() => vi.fn());
const mockHandleGoogleSignup = vi.hoisted(() => vi.fn());
const mockHandleOrcidSignup = vi.hoisted(() => vi.fn());
const mockConvertFirebaseUser = vi.hoisted(() => vi.fn());
const mockSetUser = vi.hoisted(() => vi.fn());
const mockCheckProfileAndRedirect = vi.hoisted(() => vi.fn());

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
	convertFirebaseUser: mockConvertFirebaseUser,
	getFirebaseAuth: vi.fn(() => ({})),
}));

vi.mock("@/utils/auth-providers", () => ({
	handleGoogleSignup: mockHandleGoogleSignup,
	handleOrcidSignup: mockHandleOrcidSignup,
}));

vi.mock("@/stores/user-store", () => ({
	useUserStore: () => ({
		setUser: mockSetUser,
	}),
}));

vi.mock("@/actions/login", () => ({
	login: mockLogin,
}));

vi.mock("@/utils/onboarding", () => ({
	checkProfileAndRedirect: mockCheckProfileAndRedirect,
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
		render(<SignupPage />);

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

			render(<SignupPage />);

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

			render(<SignupPage />);

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

			render(<SignupPage />);

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

			render(<SignupPage />);

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

			render(<SignupPage />);

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

			render(<SignupPage />);

			const googleButton = screen.getByRole("button", { name: /google/i });
			const orcidButton = screen.getByRole("button", { name: /orcid/i });

			expect(googleButton).toBeDisabled();
			expect(orcidButton).toBeDisabled();
		});

		it("shows correct disabled state when consent changes", () => {
			const { rerender } = render(<SignupPage />);

			let googleButton = screen.getByRole("button", { name: /google/i });
			let orcidButton = screen.getByRole("button", { name: /orcid/i });

			expect(googleButton).not.toBeDisabled();
			expect(orcidButton).not.toBeDisabled();

			mockUseCookieConsent.mockReturnValue({
				hasConsent: false,
				isHydrated: true,
			});

			rerender(<SignupPage />);

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

			render(<SignupPage />);

			const firstNameInput = screen.getByLabelText(/first name/i);
			const lastNameInput = screen.getByLabelText(/last name/i);
			const emailInput = screen.getByLabelText(/email/i);

			expect(firstNameInput).not.toBeDisabled();
			expect(lastNameInput).not.toBeDisabled();
			expect(emailInput).not.toBeDisabled();
		});
	});

	describe.sequential("New User Signup Flow", () => {
		const mockUser = {
			displayName: "Test User",
			email: "test@example.com",
			uid: "test-uid-123",
		} as User;

		beforeEach(() => {
			mockUseCookieConsent.mockReturnValue({
				hasConsent: true,
				isHydrated: true,
			});
			mockLogin.mockResolvedValue({ is_backoffice_admin: false });
			mockConvertFirebaseUser.mockReturnValue(mockUser);
		});

		it("calls login with isNewUser=true when user signs up with Google", async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const idToken = "mock-id-token";

			mockHandleGoogleSignup.mockResolvedValue({
				idToken,
				isNewUser: true,
				user: mockUser,
			});

			render(<SignupPage />);

			const googleButton = screen.getByRole("button", { name: /google/i });
			await user.click(googleButton);

			await waitFor(() => {
				expect(mockLogin).toHaveBeenCalledWith(idToken, true);
			});
		});

		it("calls login with isNewUser=true when user signs up with ORCID", async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const idToken = "mock-id-token";

			mockHandleOrcidSignup.mockResolvedValue({
				idToken,
				isNewUser: true,
				user: mockUser,
			});

			render(<SignupPage />);

			const orcidButton = screen.getByRole("button", { name: /orcid/i });
			await user.click(orcidButton);

			await waitFor(() => {
				expect(mockLogin).toHaveBeenCalledWith(idToken, true);
			});
		});

		it("shows success message and redirects when new user signs up", async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const idToken = "mock-id-token";

			mockHandleGoogleSignup.mockResolvedValue({
				idToken,
				isNewUser: true,
				user: mockUser,
			});

			render(<SignupPage />);

			const googleButton = screen.getByRole("button", { name: /google/i });
			await user.click(googleButton);

			const { toast } = await import("sonner");
			await waitFor(() => {
				expect(toast.success).toHaveBeenCalledWith("Account created successfully!");
			});

			await waitFor(() => {
				expect(mockSetUser).toHaveBeenCalledWith(mockUser);
				expect(mockLogin).toHaveBeenCalledWith(idToken, true);
				expect(mockCheckProfileAndRedirect).toHaveBeenCalledWith(mockUser.displayName);
			});
		});

		it("does not call login when user already exists", async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			mockHandleGoogleSignup.mockResolvedValue({
				idToken: "mock-id-token",
				isNewUser: false,
				user: mockUser,
			});

			render(<SignupPage />);

			const googleButton = screen.getByRole("button", { name: /google/i });
			await user.click(googleButton);

			await waitFor(() => {
				expect(mockLogin).not.toHaveBeenCalled();
			});

			await waitFor(() => {
				expect(screen.getByText(/This email is already registered/i)).toBeInTheDocument();
			});
		});

		it("handles signup error gracefully", async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const errorMessage = "Authentication failed";

			mockHandleGoogleSignup.mockRejectedValue(new Error(errorMessage));

			render(<SignupPage />);

			const googleButton = screen.getByRole("button", { name: /google/i });
			await user.click(googleButton);

			const { toast } = await import("sonner");
			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(errorMessage);
			});

			expect(mockLogin).not.toHaveBeenCalled();
		});
	});
});
