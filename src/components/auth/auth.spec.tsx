import { AuthMethod } from "@/config/enums";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Auth } from "./auth";

// Mocking the components
vi.mock("@/components/auth/password-signin-form", () => ({
	PasswordSigninForm: () => <div data-testid="password-signin-form" />,
}));
vi.mock("@/components/auth/email-signin-form", () => ({
	EmailSigninForm: () => <div data-testid="email-signin-form" />,
}));
vi.mock("@/components/auth/signup-form", () => ({
	SignupForm: () => <div data-testid="signup-form" />,
}));
vi.mock("@/components/auth/forgot-password-form", () => ({
	ForgotPasswordForm: () => <div data-testid="forgot-password-form" />,
}));
vi.mock("@/components/auth/oauth-signin-form", () => ({
	OauthSigninForm: () => <div data-testid="oauth-signin-form" />,
}));

describe("Auth Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the auth view container", async () => {
		render(<Auth enabledAuthMethods={new Set([AuthMethod.EMAIL_SIGNIN])} />);
		expect(screen.getByTestId("auth-view")).toBeInTheDocument();
		expect(screen.getByTestId("card-container")).toBeInTheDocument();
		expect(screen.getByTestId("card-header")).toBeInTheDocument();
		expect(screen.getByTestId("card-title")).toBeInTheDocument();
		expect(screen.getByTestId("card-content")).toBeInTheDocument();
	});

	it("renders email signin form by default when email signin is enabled", async () => {
		render(<Auth enabledAuthMethods={new Set([AuthMethod.EMAIL_SIGNIN, AuthMethod.PASSWORD_SIGNIN])} />);
		await waitFor(() => {
			expect(screen.getByTestId("email-signin-form")).toBeInTheDocument();
			expect(screen.queryByTestId("password-signin-form")).not.toBeInTheDocument();
		});
	});

	it("renders password signin form by default when only password signin is enabled", async () => {
		render(<Auth enabledAuthMethods={new Set([AuthMethod.PASSWORD_SIGNIN])} />);
		await waitFor(() => {
			expect(screen.getByTestId("password-signin-form")).toBeInTheDocument();
			expect(screen.queryByTestId("email-signin-form")).not.toBeInTheDocument();
		});
	});

	it("switches to signup form when signup button is clicked", async () => {
		const user = userEvent.setup();
		render(<Auth enabledAuthMethods={new Set([AuthMethod.PASSWORD_SIGNIN, AuthMethod.EMAIL_SIGNIN])} />);
		await user.click(screen.getByTestId("signup-button"));
		await waitFor(() => {
			expect(screen.getByTestId("signup-form")).toBeInTheDocument();
			expect(screen.queryByTestId("email-signin-form")).not.toBeInTheDocument();
			expect(screen.queryByTestId("password-signin-form")).not.toBeInTheDocument();
		});
	});

	it("shows forgot password form when on password signin and forgot password button is clicked", async () => {
		const user = userEvent.setup();
		render(<Auth enabledAuthMethods={new Set([AuthMethod.PASSWORD_SIGNIN])} />);
		expect(screen.getByTestId("forgotPassword-button")).toBeInTheDocument();
		await user.click(screen.getByTestId("forgotPassword-button"));
		await waitFor(() => {
			expect(screen.getByTestId("forgot-password-form")).toBeInTheDocument();
			expect(screen.queryByTestId("password-signin-form")).not.toBeInTheDocument();
		});
	});

	it("renders OAuth signin options when enabled", async () => {
		render(<Auth enabledAuthMethods={new Set([AuthMethod.OAUTH_SIGNIN])} />);
		await waitFor(() => {
			expect(screen.getByTestId("oauth-signin-form")).toBeInTheDocument();
		});
	});

	it("renders both email and OAuth signin options when both are enabled", async () => {
		render(<Auth enabledAuthMethods={new Set([AuthMethod.EMAIL_SIGNIN, AuthMethod.OAUTH_SIGNIN])} />);
		await waitFor(() => {
			expect(screen.getByTestId("email-signin-form")).toBeInTheDocument();
			expect(screen.getByTestId("oauth-signin-form")).toBeInTheDocument();
			expect(screen.queryByTestId("password-signin-form")).not.toBeInTheDocument();
		});
	});

	it("does not render signup button when only password signin is enabled", async () => {
		render(<Auth enabledAuthMethods={new Set([AuthMethod.PASSWORD_SIGNIN])} />);
		expect(screen.queryByTestId("signup-button")).not.toBeInTheDocument();
	});

	it("does not render forgot password button when only email signin is enabled", async () => {
		render(<Auth enabledAuthMethods={new Set([AuthMethod.EMAIL_SIGNIN])} />);
		expect(screen.queryByTestId("forgotPassword-button")).not.toBeInTheDocument();
	});

	it("switches between email and password signin forms", async () => {
		const user = userEvent.setup();
		render(<Auth enabledAuthMethods={new Set([AuthMethod.EMAIL_SIGNIN, AuthMethod.PASSWORD_SIGNIN])} />);

		// Initially on email signin form
		expect(screen.getByTestId("email-signin-form")).toBeInTheDocument();

		// Switch to password signin
		await user.click(screen.getByTestId("passwordSignin-button"));
		await waitFor(() => {
			expect(screen.getByTestId("password-signin-form")).toBeInTheDocument();
			expect(screen.queryByTestId("email-signin-form")).not.toBeInTheDocument();
		});

		// Switch back to email signin
		await user.click(screen.getByTestId("emailSignin-button"));
		await waitFor(() => {
			expect(screen.getByTestId("email-signin-form")).toBeInTheDocument();
			expect(screen.queryByTestId("password-signin-form")).not.toBeInTheDocument();
		});
	});

	it("updates the title when switching between forms", async () => {
		const user = userEvent.setup();
		render(<Auth enabledAuthMethods={new Set([AuthMethod.EMAIL_SIGNIN, AuthMethod.PASSWORD_SIGNIN])} />);

		// Initial title
		expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();

		// Switch to signup
		await user.click(screen.getByTestId("signup-button"));
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Sign up" })).toBeInTheDocument();
		});

		// Switch to password signin to see forgot password option
		await user.click(screen.getByTestId("passwordSignin-button"));
		await waitFor(() => {
			expect(screen.getByTestId("forgotPassword-button")).toBeInTheDocument();
		});

		// Switch to forgot password
		await user.click(screen.getByTestId("forgotPassword-button"));
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Forgot password" })).toBeInTheDocument();
		});
	});

	it("renders the separator when OAuth is enabled", async () => {
		render(<Auth enabledAuthMethods={new Set([AuthMethod.EMAIL_SIGNIN, AuthMethod.OAUTH_SIGNIN])} />);
		expect(screen.getByText("Or sign in with")).toBeInTheDocument();
	});

	it("does not render the separator when OAuth is disabled", async () => {
		render(<Auth enabledAuthMethods={new Set([AuthMethod.EMAIL_SIGNIN, AuthMethod.PASSWORD_SIGNIN])} />);
		expect(screen.queryByText("Or sign in with")).not.toBeInTheDocument();
	});
});
