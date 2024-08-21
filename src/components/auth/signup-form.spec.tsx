import { mockToast } from "::testing/global-mocks";
import { signUp } from "@/actions/auth";
import { PagePath } from "@/config/enums";
import { InfoMessage } from "@/constants";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockRouter from "next-router-mock";
import { SignupForm } from "./signup-form";

vi.mock("@/actions/auth");

describe("SignupForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the form correctly", () => {
		render(<SignupForm />);

		expect(screen.getByTestId("signup-form")).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Password")).toBeInTheDocument();
		expect(screen.getByTestId("signup-form-submit-button")).toBeInTheDocument();
	});

	it("disables submit button when form is invalid", () => {
		render(<SignupForm />);

		const submitButton = screen.getByTestId("signup-form-submit-button");
		expect(submitButton).toBeDisabled();
	});

	it("enables submit button when form is valid", async () => {
		render(<SignupForm />);

		const emailInput = screen.getByTestId("signup-form-email-input");
		const passwordInput = screen.getByTestId("signup-form-password-input");
		const submitButton = screen.getByTestId("signup-form-submit-button");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "password123");

		await waitFor(() => {
			expect(submitButton).not.toBeDisabled();
		});
	});

	it("submits the form with valid data", async () => {
		vi.mocked(signUp).mockResolvedValueOnce(undefined);

		render(<SignupForm />);

		const emailInput = screen.getByTestId("signup-form-email-input");
		const passwordInput = screen.getByTestId("signup-form-password-input");
		const submitButton = screen.getByTestId("signup-form-submit-button");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "password123");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(signUp).toHaveBeenCalledWith("test@example.com", "password123");
			expect((mockToast as any).success).toHaveBeenCalledWith(InfoMessage.CONFIRMATION_EMAIL_SENT, { duration: 3000 });
			expect(mockRouter.pathname).toEqual(PagePath.ROOT);
		});
	});

	it("displays error toast when signup fails", async () => {
		const errorMessage = "Signup failed";
		vi.mocked(signUp).mockResolvedValueOnce(errorMessage);

		render(<SignupForm />);

		const emailInput = screen.getByTestId("signup-form-email-input");
		const passwordInput = screen.getByTestId("signup-form-password-input");
		const submitButton = screen.getByTestId("signup-form-submit-button");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "password123");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(signUp).toHaveBeenCalledWith("test@example.com", "password123");
			expect((mockToast as any).error).toHaveBeenCalledWith(errorMessage, { duration: 3000 });
			expect(mockRouter.pathname).toEqual(PagePath.ROOT);
		});
	});
});
