import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { mockToast } from "::testing/global-mocks";
import { signInWithEmail, verifyEmailOTP } from "@/actions/auth";
import { EmailSigninType } from "@/config/enums";
import { InfoMessage } from "@/constants";
import { toast } from "sonner";
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
		vi.mocked(signInWithEmail).mockImplementationOnce(
			() =>
				new Promise((resolve) =>
					setTimeout(() => {
						resolve(undefined);
					}, 5),
				),
		);

		render(<EmailSigninForm />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		await userEvent.click(submitButton);

		expect(submitButton).toHaveAttribute("aria-busy", "true");
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

	it("shows error toast on email submission failure", async () => {
		const mockSignInWithEmail = vi.mocked(signInWithEmail);
		mockSignInWithEmail.mockResolvedValueOnce("Error in sending OTP");

		render(<EmailSigninForm />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockSignInWithEmail).toHaveBeenCalledWith("test@example.com", EmailSigninType.OTP);
		});
		expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Error in sending OTP", { duration: 3000 });
	});

	it("renders OTP form after successful email submission", async () => {
		const mockSignInWithEmail = vi.mocked(signInWithEmail);
		mockSignInWithEmail.mockResolvedValueOnce(undefined);

		render(<EmailSigninForm />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByTestId("email-signin-otp-form")).toBeInTheDocument();
		});
	});

	it("shows error toast on OTP submission failure", async () => {
		const mockSignInWithEmail = vi.mocked(signInWithEmail);
		const mockVerifyEmailOTP = vi.mocked(verifyEmailOTP);
		mockSignInWithEmail.mockResolvedValueOnce(undefined);
		mockVerifyEmailOTP.mockResolvedValueOnce("Invalid OTP");

		render(<EmailSigninForm />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByTestId("email-signin-otp-form")).toBeInTheDocument();
		});

		const otpInput = screen.getByTestId("email-signin-form-otp-input");
		await userEvent.type(otpInput, "123456");

		const otpSubmitButton = screen.getByTestId("email-signin-form-verify-button");
		await userEvent.click(otpSubmitButton);

		await waitFor(() => {
			expect(mockVerifyEmailOTP).toHaveBeenCalledWith("test@example.com", "123456");
		});
		expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Invalid OTP", { duration: 3000 });
	});

	it("shows success toast on OTP submission success", async () => {
		const mockSignInWithEmail = vi.mocked(signInWithEmail);
		const mockVerifyEmailOTP = vi.mocked(verifyEmailOTP);
		mockSignInWithEmail.mockResolvedValueOnce(undefined);
		mockVerifyEmailOTP.mockResolvedValueOnce(undefined);

		render(<EmailSigninForm />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByTestId("email-signin-otp-form")).toBeInTheDocument();
		});

		const otpInput = screen.getByTestId("email-signin-form-otp-input");
		await userEvent.type(otpInput, "123456");

		const otpSubmitButton = screen.getByTestId("email-signin-form-verify-button");
		await userEvent.click(otpSubmitButton);

		await waitFor(() => {
			expect(mockVerifyEmailOTP).toHaveBeenCalledWith("test@example.com", "123456");
		});
		expect(vi.mocked(toast.success)).toHaveBeenCalled();
	});
});
