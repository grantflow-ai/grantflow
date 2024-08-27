import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { mockToast } from "::testing/global-mocks";
import { signInWithEmail } from "@/actions/auth";
import { EmailSigninType } from "@/config/enums";
import { InfoMessage } from "@/constants";
import { EmailSigninForm } from "./email-signin-form";

vi.mock("@/actions/auth");

describe("EmailSigninForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the form correctly", () => {
		render(<EmailSigninForm />);

		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByTestId("email-signin-form-email-input")).toBeInTheDocument();
		expect(screen.getByTestId("email-signin-form-submit-button")).toBeInTheDocument();
	});

	it("disables submit button when form is invalid", () => {
		render(<EmailSigninForm />);

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		expect(submitButton).toBeDisabled();
	});

	it("enables submit button when form is valid", async () => {
		render(<EmailSigninForm />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		await waitFor(() => {
			expect(submitButton).not.toBeDisabled();
		});
	});

	it("calls signInWithEmailOTP with correct email on form submission", async () => {
		const mockSignInWithEmailOTP = vi.mocked(signInWithEmail);
		mockSignInWithEmailOTP.mockResolvedValueOnce(undefined);

		render(<EmailSigninForm />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockSignInWithEmailOTP).toHaveBeenCalledWith("test@example.com", EmailSigninType.OTP);
		});
	});

	it("displays success toast when OTP is sent successfully", async () => {
		const mockSignInWithEmailOTP = vi.mocked(signInWithEmail);
		mockSignInWithEmailOTP.mockResolvedValueOnce(undefined);

		render(<EmailSigninForm />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect((mockToast as any).info).toHaveBeenCalledWith(InfoMessage.EMAIL_OTP_SENT, { duration: 3000 });
		});
	});

	it("displays error toast when signInWithEmailOTP fails", async () => {
		const mockSignInWithEmailOTP = vi.mocked(signInWithEmail);
		const errorMessage = "Failed to send OTP";
		mockSignInWithEmailOTP.mockResolvedValueOnce(errorMessage);

		render(<EmailSigninForm />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect((mockToast as any).error).toHaveBeenCalledWith(errorMessage, { duration: 3000 });
		});
	});

	it("shows loading state on submit button while form is submitting", async () => {
		const mockSignInWithEmailOTP = vi.mocked(signInWithEmail);
		mockSignInWithEmailOTP.mockImplementationOnce(
			() =>
				new Promise((resolve) =>
					setTimeout(() => {
						resolve(undefined);
					}, 100),
				),
		);

		render(<EmailSigninForm />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		await userEvent.click(submitButton);

		expect(submitButton).toHaveAttribute("aria-busy", "true");

		await waitFor(() => {
			expect(submitButton).not.toHaveAttribute("aria-busy", "true");
		});
	});

	it("maintains the email input value after failed submission", async () => {
		const mockSignInWithEmailOTP = vi.mocked(signInWithEmail);
		mockSignInWithEmailOTP.mockResolvedValueOnce("Error message");

		render(<EmailSigninForm />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(emailInput).toHaveValue("test@example.com");
		});
	});
});
