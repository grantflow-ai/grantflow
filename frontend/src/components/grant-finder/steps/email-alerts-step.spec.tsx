import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailAlertsStep } from "./email-alerts-step";

vi.mock("../form-summary", () => ({
	FormSummary: () => <div data-testid="form-summary-mock" />,
}));

describe("EmailAlertsStep", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	const mockFormData = {
		activityCodes: [],
		agreeToTerms: false,
		agreeToUpdates: false,
		careerStage: [],
		email: "",
		institutionLocation: [],
		keywords: "",
	};

	it("should render the title and description", () => {
		const setFormData = vi.fn();
		render(<EmailAlertsStep formData={mockFormData} setFormData={setFormData} />);

		expect(screen.getByTestId("email-alerts-step-title")).toHaveTextContent("Alerts Setting");
		expect(screen.getByTestId("email-alerts-step-description")).toHaveTextContent(
			"Enter your email. We'll notify you the moment your next funding opportunity is announced. No spam; unsubscribe anytime.",
		);
	});

	it("should render the mocked FormSummary", () => {
		const setFormData = vi.fn();
		render(<EmailAlertsStep formData={mockFormData} setFormData={setFormData} />);
		expect(screen.getByTestId("form-summary-mock")).toBeInTheDocument();
	});

	it("should reflect initial form data in the input and checkboxes", () => {
		const setFormData = vi.fn();
		const formDataWithValues = {
			...mockFormData,
			agreeToTerms: true,
			agreeToUpdates: true,
			email: "test@example.com",
		};
		render(<EmailAlertsStep formData={formDataWithValues} setFormData={setFormData} />);

		const emailInput = screen.getByLabelText("Email address");
		expect(emailInput).toHaveValue("test@example.com");

		const termsCheckbox = screen.getByTestId("terms-checkbox");
		expect(termsCheckbox).toBeChecked();

		const updatesCheckbox = screen.getByTestId("updates-checkbox");
		expect(updatesCheckbox).toBeChecked();
	});

	it("should call setFormData when the email input changes", () => {
		const setFormData = vi.fn();
		render(<EmailAlertsStep formData={mockFormData} setFormData={setFormData} />);

		const emailInput = screen.getByLabelText("Email address");
		fireEvent.change(emailInput, { target: { value: "new@email.com" } });

		expect(setFormData).toHaveBeenCalledWith({
			...mockFormData,
			email: "new@email.com",
		});
	});

	it("should call setFormData when the terms checkbox is clicked", async () => {
		const setFormData = vi.fn();
		render(<EmailAlertsStep formData={mockFormData} setFormData={setFormData} />);
		const user = userEvent.setup();

		const termsCheckbox = screen.getByTestId("terms-checkbox");
		await user.click(termsCheckbox);

		expect(setFormData).toHaveBeenCalledWith({
			...mockFormData,
			agreeToTerms: true,
		});
	});

	it("should call setFormData when the updates checkbox is clicked", async () => {
		const setFormData = vi.fn();
		render(<EmailAlertsStep formData={mockFormData} setFormData={setFormData} />);
		const user = userEvent.setup();

		const updatesCheckbox = screen.getByTestId("updates-checkbox");
		await user.click(updatesCheckbox);

		expect(setFormData).toHaveBeenCalledWith({
			...mockFormData,
			agreeToUpdates: true,
		});
	});
});
