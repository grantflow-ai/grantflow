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
		expect(screen.getByTestId("email-signin-form-gdpr-checkbox")).toBeInTheDocument();
		expect(screen.getByTestId("email-signin-form-submit-button")).toBeInTheDocument();
	});

	it("shows loading state when isLoading is true", () => {
		render(<SigninForm isLoading={true} onSubmit={mockOnSubmit} />);

		const submitButtons = screen.getAllByTestId("email-signin-form-submit-button");
		const loadingButton = submitButtons.find((button) => button.getAttribute("aria-busy") === "true");
		expect(loadingButton).toBeDefined();
		expect(loadingButton).toHaveTextContent("Start here");
	});

	it("disables submit button when form is invalid", async () => {
		const user = userEvent.setup();
		render(<SigninForm isLoading={false} onSubmit={mockOnSubmit} />);

		const submitButtons = screen.getAllByTestId("email-signin-form-submit-button");
		const activeButton = submitButtons.find((button) => button.getAttribute("aria-busy") === "false");
		expect(activeButton).toBeDisabled();

		const emailInput = screen.getByTestId("email-signin-form-email-input");
		await user.type(emailInput, "invalid");

		expect(activeButton).toBeDisabled();
	});

	it("requires GDPR consent checkbox to enable submit button", async () => {
		const user = userEvent.setup();
		render(<SigninForm isLoading={false} onSubmit={mockOnSubmit} />);

		const submitButtons = screen.getAllByTestId("email-signin-form-submit-button");
		const activeButton = submitButtons.find((button) => button.getAttribute("aria-busy") === "false");
		const gdprCheckbox = screen.getByTestId("email-signin-form-gdpr-checkbox");
		const firstNameInput = screen.getByTestId("email-signin-form-firstname-input");
		const lastNameInput = screen.getByTestId("email-signin-form-lastname-input");
		const emailInput = screen.getByTestId("email-signin-form-email-input");

		// Fill all required fields
		await user.type(firstNameInput, "John");
		await user.type(lastNameInput, "Doe");
		await user.type(emailInput, "john@example.com");

		// Submit should still be disabled because GDPR consent is not checked
		expect(activeButton).toBeDisabled();

		// Check GDPR consent
		await user.click(gdprCheckbox);

		// Now submit should be enabled
		expect(activeButton).not.toBeDisabled();
	});
});
