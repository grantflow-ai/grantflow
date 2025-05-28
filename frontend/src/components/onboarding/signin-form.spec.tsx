import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SigninForm } from "./signin-form";

describe("EmailSigninForm", () => {
	const mockOnSubmit = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the form correctly", () => {
		render(<SigninForm isLoading={false} onSubmit={mockOnSubmit} />);

		expect(screen.getByTestId("email-signin-form-container")).toBeInTheDocument();
		expect(screen.getByTestId("email-signin-form")).toBeInTheDocument();
		expect(screen.getByTestId("email-signin-form-firstname-input")).toBeInTheDocument();
		expect(screen.getByTestId("email-signin-form-lastname-input")).toBeInTheDocument();
		expect(screen.getByTestId("email-signin-form-email-input")).toBeInTheDocument();
		expect(screen.getByTestId("email-signin-form-submit-button")).toBeInTheDocument();
	});

	it("shows loading state when isLoading is true", () => {
		render(<SigninForm isLoading={true} onSubmit={mockOnSubmit} />);

		const submitButton = screen.getByTestId("email-signin-form-submit-button");
		expect(submitButton).toHaveAttribute("aria-busy", "true");
		expect(submitButton).not.toHaveTextContent("Send Magic Link");
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
