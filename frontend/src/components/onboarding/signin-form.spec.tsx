import { fireEvent, render, screen } from "@testing-library/react";
import { SigninForm } from "./signin-form";
import userEvent from "@testing-library/user-event";
import { act } from "react";

describe("EmailSigninForm", () => {
	const mockOnSubmit = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the form correctly", () => {
		render(<SigninForm isLoading={false} onSubmit={mockOnSubmit} />);

		expect(screen.getByTestId("email-signin-form-container")).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByTestId("email-signin-form-submit-button")).toBeInTheDocument();
		expect(screen.getByText("Send Magic Link")).toBeInTheDocument();
	});

	it("shows loading state when isLoading is true", () => {
		render(<SigninForm isLoading={true} onSubmit={mockOnSubmit} />);

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		expect(submitButton).toHaveAttribute("aria-busy", "true");
		expect(submitButton).not.toHaveTextContent("Send Magic Link");
	});

	it("allows whitelisted email addresses and enables submit button", async () => {
		const user = userEvent.setup();
		render(<SigninForm isLoading={false} onSubmit={mockOnSubmit} />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await user.type(emailInput, "allonwag@berkeley.edu");
		fireEvent.blur(emailInput);

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
		});

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		expect(submitButton).not.toBeDisabled();
	});

	it("submits the form with valid data", async () => {
		const user = userEvent.setup();
		render(<SigninForm isLoading={false} onSubmit={mockOnSubmit} />);

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await user.type(emailInput, "allonwag@berkeley.edu");

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
		});

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		expect(submitButton).not.toBeDisabled();

		await user.click(submitButton);

		expect(mockOnSubmit).toHaveBeenCalledWith({ email: "allonwag@berkeley.edu" }, expect.anything());
	});

	it("disables submit button when form is invalid", async () => {
		const user = userEvent.setup();
		render(<SigninForm isLoading={false} onSubmit={mockOnSubmit} />);

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		expect(submitButton).toBeDisabled();

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await user.type(emailInput, "invalid");

		expect(submitButton).toBeDisabled();
	});
});
