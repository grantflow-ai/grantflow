import type { AuthConfig } from "@/config/auth";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Auth } from "./auth";

const { mockAuthConfig } = vi.hoisted(() => ({
	mockAuthConfig: {
		emailSignin: true,
		// @ts-ignore
		emailSigninType: "OTP",
		phoneSignin: true,
		// @ts-ignore
		phoneSigninType: "SMS",
		passwordSignin: true,
		oauthSignin: true,
		oauthProviders: [],
	} satisfies AuthConfig,
}));

vi.mock("@/config/auth", () => ({
	getAuthConfig: vi.fn().mockReturnValue(mockAuthConfig),
}));

describe("Auth Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the auth view container", async () => {
		render(<Auth />);
		expect(screen.getByTestId("card-container")).toBeInTheDocument();
		expect(screen.getByTestId("card-header")).toBeInTheDocument();
		expect(screen.getByTestId("card-title")).toBeInTheDocument();
		expect(screen.getByTestId("card-content")).toBeInTheDocument();
	});

	it("renders email signin form by default when email signin is enabled", async () => {
		render(<Auth />);
		await waitFor(() => {
			expect(screen.getByTestId("email-signin-otp-form")).toBeInTheDocument();
			expect(screen.queryByTestId("password-signin-form")).not.toBeInTheDocument();
		});
	});

	it("switches to signup form when signup button is clicked", async () => {
		const user = userEvent.setup();
		render(<Auth />);
		await user.click(screen.getByTestId("signup-button"));
		await waitFor(() => {
			expect(screen.getByTestId("signup-form")).toBeInTheDocument();
			expect(screen.queryByTestId("email-signin-otp-form")).not.toBeInTheDocument();
		});
	});

	it("switches to forgot password form when forgot password button is clicked", async () => {
		const user = userEvent.setup();
		render(<Auth />);
		await user.click(screen.getByTestId("passwordSignin-button"));
		await waitFor(() => {
			expect(screen.getByTestId("password-signin-form")).toBeInTheDocument();
		});
		await user.click(screen.getByTestId("forgotPassword-button"));
		await waitFor(() => {
			expect(screen.getByTestId("forgot-password-form")).toBeInTheDocument();
			expect(screen.queryByTestId("password-signin-form")).not.toBeInTheDocument();
		});
	});

	it("renders OAuth signin options when enabled", async () => {
		render(<Auth />);
		expect(screen.getByText("Or sign in with")).toBeInTheDocument();
	});

	it("renders both email and OAuth signin options when both are enabled", async () => {
		render(<Auth />);
		await waitFor(() => {
			expect(screen.getByTestId("email-signin-otp-form")).toBeInTheDocument();
			expect(screen.getByText("Or sign in with")).toBeInTheDocument();
		});
	});

	it("renders signup button when email or phone signin is enabled", async () => {
		render(<Auth />);
		expect(screen.getByTestId("signup-button")).toBeInTheDocument();
	});

	it("switches between email and password signin forms", async () => {
		const user = userEvent.setup();
		render(<Auth />);

		// Initially on email signin form
		expect(screen.getByTestId("email-signin-otp-form")).toBeInTheDocument();

		// Switch to password signin
		await user.click(screen.getByTestId("passwordSignin-button"));
		await waitFor(() => {
			expect(screen.getByTestId("password-signin-form")).toBeInTheDocument();
			expect(screen.queryByTestId("email-signin-otp-form")).not.toBeInTheDocument();
		});

		// Switch back to email signin
		await user.click(screen.getByTestId("emailSignin-button"));
		await waitFor(() => {
			expect(screen.getByTestId("email-signin-otp-form")).toBeInTheDocument();
			expect(screen.queryByTestId("password-signin-form")).not.toBeInTheDocument();
		});
	});

	it("updates the title when switching between forms", async () => {
		const user = userEvent.setup();
		render(<Auth />);

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
		render(<Auth />);
		expect(screen.getByText("Or sign in with")).toBeInTheDocument();
	});
});
