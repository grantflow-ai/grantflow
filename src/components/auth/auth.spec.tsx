import { mockToast } from "::testing/global-mocks";
import { getEnabledAuthMethods } from "@/config/auth";
import { AuthMethod, PagePath } from "@/config/enums";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockRouter from "next-router-mock";
import { Auth } from "./auth";

vi.mock("@/config/auth", () => ({
	getEnabledAuthMethods: vi.fn(),
}));

describe("Auth Component", () => {
	beforeEach(() => {
		mockToast.mockReset();
		vi.mocked(getEnabledAuthMethods).mockReturnValue(new Set(Object.values(AuthMethod)));
	});

	it("renders the auth view with default email sign-in form", () => {
		render(<Auth />);
		expect(screen.getByTestId("auth-view")).toBeInTheDocument();
		expect(screen.getByTestId("card-container")).toBeInTheDocument();
		expect(screen.getByTestId("card-header")).toBeInTheDocument();
		expect(screen.getByTestId("card-title")).toHaveTextContent("Sign in");
		expect(screen.getByTestId("email-signin-form")).toBeInTheDocument();
	});

	it("switches to sign-up form when 'Sign up' button is clicked", async () => {
		render(<Auth />);
		const signUpButton = screen.getByTestId("signup-button");
		await userEvent.click(signUpButton);
		expect(screen.getByTestId("card-title")).toHaveTextContent("Sign up");
		expect(screen.getByTestId("signup-form")).toBeInTheDocument();
	});

	it("switches to password sign-in form when 'Sign in with password' button is clicked", async () => {
		render(<Auth />);
		const passwordSignInButton = screen.getByTestId("password-signin-button");
		await userEvent.click(passwordSignInButton);
		expect(screen.getByTestId("card-title")).toHaveTextContent("Sign in");
		expect(screen.getByTestId("password-signin-form")).toBeInTheDocument();
	});

	it("switches to forgot password form when 'Forgot password?' button is clicked", async () => {
		render(<Auth />);
		const passwordSignInButton = screen.getByTestId("password-signin-button");
		await userEvent.click(passwordSignInButton);
		const forgotPasswordButton = screen.getByTestId("forgot-password-button");
		await userEvent.click(forgotPasswordButton);
		expect(screen.getByTestId("card-title")).toHaveTextContent("Forgot password");
		expect(screen.getByTestId("forgot-password-form")).toBeInTheDocument();
	});

	it("switches back to email sign-in form when 'Sign in with email link' button is clicked", async () => {
		render(<Auth />);
		const passwordSignInButton = screen.getByTestId("password-signin-button");
		await userEvent.click(passwordSignInButton);
		const emailSignInButton = screen.getByTestId("email-signin-button");
		await userEvent.click(emailSignInButton);
		expect(screen.getByTestId("card-title")).toHaveTextContent("Sign in");
		expect(screen.getByTestId("email-signin-form")).toBeInTheDocument();
	});

	it("renders OAuth sign-in options when enabled", () => {
		render(<Auth />);
		expect(screen.getByTestId("oauth-signin")).toBeInTheDocument();
		expect(screen.getByTestId("oauth-signin-form-google-button")).toBeInTheDocument();
		expect(screen.getByTestId("oauth-signin-form-github-button")).toBeInTheDocument();
	});

	it("does not render OAuth sign-in options when disabled", () => {
		vi.mocked(getEnabledAuthMethods).mockReturnValueOnce(
			new Set([AuthMethod.EMAIL_SIGNIN, AuthMethod.PASSWORD_SIGNIN]),
		);
		render(<Auth />);
		expect(screen.queryByTestId("oauth-signin")).not.toBeInTheDocument();
	});

	it("email sign-in form submission", async () => {
		render(<Auth />);
		const emailInput = screen.getByTestId("email-signin-form-email-input");
		const submitButton = screen.getByTestId("email-signin-form-submit-button");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect((mockToast as any).info).toHaveBeenCalledWith("A sign-in link has been sent to your email", {
				duration: 3000,
			});
		});
	});

	it("password sign-in form submission", async () => {
		render(<Auth />);
		const passwordSignInButton = screen.getByTestId("password-signin-button");
		await userEvent.click(passwordSignInButton);

		const emailInput = screen.getByTestId("password-signin-form-email-input");
		const passwordInput = screen.getByTestId("password-signin-form-password-input");
		const submitButton = screen.getByTestId("password-signin-form-submit-button");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "password123");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockRouter.pathname).toEqual(PagePath.ROOT);
		});
	});

	it("forgot password form submission", async () => {
		render(<Auth />);
		const passwordSignInButton = screen.getByTestId("password-signin-button");
		await userEvent.click(passwordSignInButton);
		const forgotPasswordButton = screen.getByTestId("forgot-password-button");
		await userEvent.click(forgotPasswordButton);

		const emailInput = screen.getByTestId("forgot-password-form-email-input");
		const submitButton = screen.getByTestId("forgot-password-form-submit-button");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect((mockToast as any).success).toHaveBeenCalledWith("Password reset link sent to your email", {
				duration: 3000,
			});
			expect(mockRouter.pathname).toEqual(PagePath.ROOT);
		});
	});

	it("sign-up form submission", async () => {
		render(<Auth />);
		const signUpButton = screen.getByTestId("signup-button");
		await userEvent.click(signUpButton);

		// Assuming the sign-up form has similar structure to other forms
		const emailInput = screen.getByTestId("signup-form-email-input");
		const passwordInput = screen.getByTestId("signup-form-password-input");
		const submitButton = screen.getByTestId("signup-form-submit-button");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "password123");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockRouter.pathname).toEqual(PagePath.ROOT);
		});
	});

	it("disables submit button when form is invalid", async () => {
		render(<Auth />);
		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		expect(submitButton).toBeDisabled();

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await userEvent.type(emailInput, "test@example.com");
		expect(submitButton).toBeEnabled();
	});
});
