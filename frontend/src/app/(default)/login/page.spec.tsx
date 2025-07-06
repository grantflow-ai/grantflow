import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { PagePath } from "@/enums";

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
	getMockAuthEnabled: vi.fn(() => false),
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
			store[key] = value.toString();
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

describe("Login Page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		cleanup();
		render(<LoginPage />);
	});

	it("renders all login page elements correctly with initial state", () => {
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
		expect(buttonLink).toHaveAttribute("href", PagePath.ONBOARDING);
	});

	describe("Email Sign-in Flow", () => {
		const user = userEvent.setup();
		const testEmail = "test@example.com";
		let emailInput: HTMLElement;
		let submitButton: HTMLElement;

		beforeEach(() => {
			vi.clearAllMocks();
			cleanup();
			render(<LoginPage />);

			emailInput = screen.getByTestId("login-form-email-input");
			submitButton = screen.getByTestId("login-form-submit-button");
		});

		it("disables submit button when email is empty or invalid", async () => {
			expect(submitButton).toBeDisabled();

			await user.type(emailInput, "invalid-email");

			expect(submitButton).toBeDisabled();

			await user.clear(emailInput);

			expect(submitButton).toBeDisabled();
		});

		it("enables submit button when email is valid", async () => {
			await user.type(emailInput, testEmail);

			expect(submitButton).toBeEnabled();
		});

		it("handles successful email sign-in flow", async () => {
			let resolvePromise: (() => void) | undefined;
			const deferred = new Promise<void>((resolve) => {
				resolvePromise = resolve;
			});
			mockSendSignInLinkToEmail.mockReturnValueOnce(deferred);

			await user.type(emailInput, testEmail);
			await user.click(submitButton);

			expect(submitButton).toBeDisabled();

			resolvePromise?.();
			await deferred;

			expect(mockSendSignInLinkToEmail).toHaveBeenCalledWith(expect.anything(), testEmail, {
				handleCodeInApp: true,
				url: expect.stringContaining("/onboarding/email"),
			});

			expect(localStorage.setItem).toHaveBeenCalledWith(FIREBASE_LOCAL_STORAGE_KEY, testEmail);

			const { toast } = await import("sonner");
			expect(toast.success).toHaveBeenCalledWith(
				"An email has been sent to your mailbox with a sign-in link.\n\nPlease check your inbox.",
			);
		});

		it("handles email sign-in error", async () => {
			let rejectPromise: ((err: unknown) => void) | undefined;
			const deferred = new Promise<void>((_resolve, reject) => {
				rejectPromise = reject;
			});
			const errorMessage = "Failed to send sign-in email";
			mockSendSignInLinkToEmail.mockReturnValueOnce(deferred);

			await user.type(emailInput, testEmail);
			await user.click(submitButton);

			expect(submitButton).toBeDisabled();

			rejectPromise?.(new Error(errorMessage));

			expect(mockSendSignInLinkToEmail).toHaveBeenCalledWith(expect.anything(), testEmail, {
				handleCodeInApp: true,
				url: expect.stringContaining("/onboarding/email"),
			});

			const { toast } = await import("sonner");
			expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
		});
	});
});
