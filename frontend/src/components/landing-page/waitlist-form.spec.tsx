import { render, screen, waitFor } from "@testing-library/react";
import { WaitlistForm } from "@/components/landing-page/waitlist-form";
import userEvent from "@testing-library/user-event";

// Create mock functions outside of the vi.mock call
const mockAddToWaitlist = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();

// Define mocked response codes
const RESPONSE_CODES = {
	SERVER_ERROR: "SERVER_ERROR",
	SUCCESS: "SUCCESS",
	VALIDATION_ERROR: "VALIDATION_ERROR",
};

// Mock the join-waitlist module
vi.mock("@/actions/join-waitlist", () => ({
	addToWaitlist: mockAddToWaitlist,
	RESPONSE_CODES,
	waitlistSchema: {
		parse: vi.fn(),
	},
}));

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

vi.mock("sonner", () => ({
	toast: {
		error: mockError,
		success: mockSuccess,
	},
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

	it("should handle successful submission", async () => {
		mockAddToWaitlist.mockResolvedValueOnce({
			code: RESPONSE_CODES.SUCCESS,
		});

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByLabelText(/email address/i);
		const nameInput = screen.getByLabelText(/name/i);
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "john.doe@example.com");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		// Wait for the form submission
		await waitFor(() => {
			expect(mockAddToWaitlist).toHaveBeenCalled();
		});

		// Verify the call arguments
		expect(mockAddToWaitlist).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "john.doe@example.com",
				name: "John Doe",
			}),
		);

		// Verify toast was called
		expect(mockSuccess).toHaveBeenCalled();
	});

	it("should handle server error", async () => {
		mockAddToWaitlist.mockResolvedValueOnce({
			code: RESPONSE_CODES.SERVER_ERROR,
		});

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByLabelText(/email address/i);
		const nameInput = screen.getByLabelText(/name/i);
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "john.doe@example.com");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		// Wait for the form submission
		await waitFor(() => {
			expect(mockAddToWaitlist).toHaveBeenCalled();
		});

		// Verify the error toast was called
		expect(mockError).toHaveBeenCalled();
	});

	it("should handle validation error with field errors", async () => {
		mockAddToWaitlist.mockResolvedValueOnce({
			code: RESPONSE_CODES.VALIDATION_ERROR,
			errors: {
				email: ["Please enter a valid email address"],
			},
		});

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByLabelText(/email address/i);
		const nameInput = screen.getByLabelText(/name/i);
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "invalid-email");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		// Wait for the form submission
		await waitFor(() => {
			expect(mockAddToWaitlist).toHaveBeenCalled();
		});
	});

	it("should handle unexpected errors during form submission", async () => {
		mockAddToWaitlist.mockRejectedValueOnce(new Error("Unexpected error"));

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByLabelText(/email address/i);
		const nameInput = screen.getByLabelText(/name/i);
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "john.doe@example.com");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		// Wait for the form submission
		await waitFor(() => {
			expect(mockAddToWaitlist).toHaveBeenCalled();
		});

		// Verify the error toast was called
		expect(mockError).toHaveBeenCalled();
	});
});
