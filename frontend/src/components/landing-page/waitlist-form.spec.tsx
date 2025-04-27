import { render, screen, waitFor } from "@testing-library/react";
import { WaitlistForm } from "./waitlist-form";
import userEvent from "@testing-library/user-event";
import React from "react";

vi.mock("@/actions/waitlist/join-waitlist", () => ({
	addToWaitlist: vi.fn(),
}));

vi.mock("@/actions/waitlist/response-mapper", () => ({
	getUserMessage: vi.fn().mockImplementation((code) => {
		const messages: Record<string, string> = {
			INVALID_EMAIL: "Please enter a valid email address",
			INVALID_NAME: "Name is required",
			SERVER_ERROR: "Something went wrong",
			SUCCESS: "Successfully joined the waitlist!",
		};
		return messages[code] || "Unknown error";
	}),
}));

vi.mock("@/actions/waitlist/waitlist-validation-schema", () => {
	const mockSchema = {
		parse: vi.fn(),
	};

	return {
		waitlistSchema: mockSchema,
	};
});

vi.mock("@hookform/resolvers/zod", () => ({
	zodResolver: vi.fn().mockImplementation(() => {
		return async (values: { email: string; name: string }) => {
			const errors: Record<string, { message: string; type: string }> = {};

			if (!values.email) {
				errors.email = { message: "Please enter a valid email address", type: "required" };
			} else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
				errors.email = { message: "Please enter a valid email address", type: "pattern" };
			}

			if (!values.name) {
				errors.name = { message: "Name must be at least 2 characters long", type: "required" };
			} else if (values.name.length < 2) {
				errors.name = { message: "Name must be at least 2 characters long", type: "minLength" };
			} else if (/\d/.test(values.name)) {
				errors.name = { message: "Name should not contain numbers", type: "pattern" };
			}

			return {
				errors: Object.keys(errors).length > 0 ? errors : undefined,
				values,
			};
		};
	}),
}));

describe("WaitlistForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the form with email and name fields and submit button", () => {
		render(<WaitlistForm />);

		expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/name/i)).toBeInTheDocument();

		expect(screen.getByPlaceholderText(/type your email address/i)).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/type your full name/i)).toBeInTheDocument();

		expect(screen.getByRole("button", { name: /join now/i })).toBeInTheDocument();
	});

	it("should show correct validation error messages when form is submitted with empty fields", async () => {
		const user = userEvent.setup();
		render(<WaitlistForm />);

		const submitButton = screen.getByRole("button", { name: /join now/i });
		await user.click(submitButton);

		await waitFor(() => {
			const emailErrorElement = screen.getByTestId("email-error");
			const nameErrorElement = screen.getByTestId("name-error");

			expect(emailErrorElement).toBeInTheDocument();
			expect(nameErrorElement).toBeInTheDocument();

			expect(emailErrorElement).toHaveTextContent("Please enter a valid email address");
			expect(nameErrorElement).toHaveTextContent("Name must be at least 2 characters long");
		});
	});

	it("should validate invalid name format", async () => {
		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByLabelText(/email address/i);
		const nameInput = screen.getByLabelText(/name/i);
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "test@gmail.com");
		await user.type(nameInput, "9");
		await user.click(submitButton);

		await waitFor(() => {
			const emailErrorElement = screen.getByTestId("name-error");
			expect(emailErrorElement).toBeInTheDocument();
			expect(emailErrorElement).toHaveTextContent("Name must be at least 2 characters long");
		});
	});

	it("should validate name with numbers", async () => {
		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByLabelText(/email address/i);
		const nameInput = screen.getByLabelText(/name/i);
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "test@gmail.com");
		await user.type(nameInput, "John123");
		await user.click(submitButton);

		await waitFor(() => {
			const nameErrorElement = screen.getByTestId("name-error");
			expect(nameErrorElement).toBeInTheDocument();
			expect(nameErrorElement).toHaveTextContent("Name should not contain numbers");
		});
	});
});
