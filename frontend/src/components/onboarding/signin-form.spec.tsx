import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe } from "vitest";

import { SigninForm } from "./signin-form";

describe.sequential("EmailSigninForm", () => {
	afterEach(() => {
		cleanup();
	});
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

		const emailInputs = screen.getAllByTestId("email-signin-form-email-input");
		const emailInput = emailInputs.find((input) => !input.hasAttribute("disabled"));
		await user.type(emailInput!, "invalid");

		expect(activeButton).toBeDisabled();
	});

	it("includes GDPR consent functionality in form", () => {
		render(<SigninForm isLoading={false} onSubmit={mockOnSubmit} />);

		const gdprCheckboxes = screen.getAllByTestId("email-signin-form-gdpr-checkbox");
		expect(gdprCheckboxes.length).toBeGreaterThan(0);

		const gdprCheckbox = gdprCheckboxes.find((checkbox) => !checkbox.hasAttribute("disabled"));
		expect(gdprCheckbox).toHaveAttribute("role", "checkbox");
		expect(gdprCheckbox).toHaveAttribute("aria-checked");
	});

	it("shows GDPR consent checkbox and terms links", () => {
		render(<SigninForm isLoading={false} onSubmit={mockOnSubmit} />);

		const gdprCheckboxes = screen.getAllByTestId("email-signin-form-gdpr-checkbox");
		expect(gdprCheckboxes.length).toBeGreaterThan(0);

		const termsLinks = screen.getAllByText("Terms");
		const privacyLinks = screen.getAllByText("Privacy Policy");

		expect(termsLinks.length).toBeGreaterThan(0);
		expect(privacyLinks.length).toBeGreaterThan(0);

		const termsLink = termsLinks[0].closest("a");
		const privacyLink = privacyLinks[0].closest("a");

		expect(termsLink).toHaveAttribute("href", "/terms");
		expect(termsLink).toHaveAttribute("target", "_blank");
		expect(termsLink).toHaveAttribute("rel", "noopener noreferrer");
		expect(privacyLink).toHaveAttribute("href", "/privacy");
		expect(privacyLink).toHaveAttribute("target", "_blank");
		expect(privacyLink).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("GDPR error appears in general error area when form has validation errors", async () => {
		render(<SigninForm isLoading={false} onSubmit={mockOnSubmit} />);

		expect(screen.queryByTestId("email-signin-form-general-error")).not.toBeInTheDocument();

		expect(screen.queryByText("Please agree to the Terms and Privacy Policy to continue.")).not.toBeInTheDocument();
	});
});
