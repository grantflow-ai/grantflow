import { mockToast } from "::testing/global-mocks";
import { requestPasswordUpdate } from "@/actions/auth";
import { PagePath } from "@/config/enums";
import { InfoMessage } from "@/constants";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockRouter from "next-router-mock";
import { ForgotPasswordForm } from "./forgot-password-form";

vi.mock("@/actions/auth");

describe("ForgotPasswordForm", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("renders the form correctly", () => {
		render(<ForgotPasswordForm />);

		expect(screen.getByTestId("forgot-password-form")).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
		expect(screen.getByTestId("forgot-password-form-submit-button")).toHaveTextContent("Send Reset Password Email");
	});

	it("disables submit button when form is empty", () => {
		render(<ForgotPasswordForm />);

		const submitButton = screen.getByTestId("forgot-password-form-submit-button");
		expect(submitButton).toBeDisabled();
	});

	it("enables submit button when form has a valid email", async () => {
		render(<ForgotPasswordForm />);

		const emailInput = screen.getByTestId("forgot-password-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("forgot-password-form-submit-button");
		await waitFor(() => {
			expect(submitButton).not.toBeDisabled();
		});
	});

	it("submits form with valid email and handles success", async () => {
		vi.mocked(requestPasswordUpdate).mockResolvedValueOnce(undefined);

		render(<ForgotPasswordForm />);

		const emailInput = screen.getByTestId("forgot-password-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("forgot-password-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(requestPasswordUpdate).toHaveBeenCalledWith("test@example.com");
			expect((mockToast as any).success).toHaveBeenCalledWith(InfoMessage.PASSWORD_RESET_LINK_SENT, { duration: 3000 });

			expect(mockRouter.pathname).toEqual(PagePath.ROOT);
		});
	});

	it("handles error during form submission", async () => {
		const errorMessage = "An error occurred";
		vi.mocked(requestPasswordUpdate).mockResolvedValueOnce(errorMessage);

		render(<ForgotPasswordForm />);

		const emailInput = screen.getByTestId("forgot-password-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("forgot-password-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(requestPasswordUpdate).toHaveBeenCalledWith("test@example.com");
			expect((mockToast as any).error).toHaveBeenCalledWith(errorMessage, { duration: 3000 });
			expect(mockRouter.pathname).toEqual(PagePath.ROOT);
		});
	});
});
