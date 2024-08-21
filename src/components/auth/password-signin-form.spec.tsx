import { mockToast } from "::testing/global-mocks";
import { signInWithPassword } from "@/actions/auth";
import { PagePath } from "@/config/enums";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockRouter from "next-router-mock";
import { PasswordSigninForm } from "./password-signin-form";

vi.mock("@/actions/auth");

describe("PasswordSigninForm", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("renders the form with email and password fields", () => {
		render(<PasswordSigninForm />);

		expect(screen.getByTestId("password-signin-form")).toBeInTheDocument();
		expect(screen.getByTestId("password-signin-form-email-input")).toBeInTheDocument();
		expect(screen.getByTestId("password-signin-form-password-input")).toBeInTheDocument();
		expect(screen.getByTestId("password-signin-form-submit-button")).toBeInTheDocument();
	});

	it("disables submit button when form is invalid", () => {
		render(<PasswordSigninForm />);

		const submitButton = screen.getByTestId("password-signin-form-submit-button");
		expect(submitButton).toBeDisabled();
	});

	it("enables submit button when form is valid", async () => {
		render(<PasswordSigninForm />);

		const emailInput = screen.getByTestId("password-signin-form-email-input");
		const passwordInput = screen.getByTestId("password-signin-form-password-input");
		const submitButton = screen.getByTestId("password-signin-form-submit-button");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "password123");

		await waitFor(() => {
			expect(submitButton).not.toBeDisabled();
		});
	});

	it("calls signInWithPassword with correct values on form submission", async () => {
		vi.mocked(signInWithPassword).mockResolvedValueOnce(undefined);

		render(<PasswordSigninForm />);

		const emailInput = screen.getByTestId("password-signin-form-email-input");
		const passwordInput = screen.getByTestId("password-signin-form-password-input");
		const submitButton = screen.getByTestId("password-signin-form-submit-button");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "password123");
		await userEvent.click(submitButton);

		expect(signInWithPassword).toHaveBeenCalledWith("test@example.com", "password123");
	});

	it("redirects to root page on successful sign-in", async () => {
		vi.mocked(signInWithPassword).mockResolvedValueOnce(undefined);

		render(<PasswordSigninForm />);

		const emailInput = screen.getByTestId("password-signin-form-email-input");
		const passwordInput = screen.getByTestId("password-signin-form-password-input");
		const submitButton = screen.getByTestId("password-signin-form-submit-button");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "password123");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockRouter.pathname).toBe(PagePath.ROOT);
		});
	});

	it("displays error toast on sign-in failure", async () => {
		const errorMessage = "Invalid credentials";
		vi.mocked(signInWithPassword).mockResolvedValueOnce(errorMessage);

		render(<PasswordSigninForm />);

		const emailInput = screen.getByTestId("password-signin-form-email-input");
		const passwordInput = screen.getByTestId("password-signin-form-password-input");
		const submitButton = screen.getByTestId("password-signin-form-submit-button");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "password123");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect((mockToast as any).error).toHaveBeenCalledWith(errorMessage, { duration: 3000 });
		});
	});

	it("does not redirect on sign-in failure", async () => {
		vi.mocked(signInWithPassword).mockResolvedValueOnce("Error");

		render(<PasswordSigninForm />);

		const emailInput = screen.getByTestId("password-signin-form-email-input");
		const passwordInput = screen.getByTestId("password-signin-form-password-input");
		const submitButton = screen.getByTestId("password-signin-form-submit-button");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "password123");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockRouter.pathname).toBe(PagePath.ROOT);
		});
	});
});
