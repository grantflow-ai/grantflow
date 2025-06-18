import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WaitlistForm } from "@/components/landing-page/waitlist-form";
import { WAITING_LIST_RESPONSE_CODES } from "@/enums";

const { mockAddToWaitlist, mockAnalyticsIdentify, mockError, mockSuccess } = vi.hoisted(() => {
	return {
		mockAddToWaitlist: vi.fn().mockResolvedValue({ code: "SUCCESS", error: null }),
		mockAnalyticsIdentify: vi.fn().mockResolvedValue(undefined),
		mockError: vi.fn(),
		mockSuccess: vi.fn(),
	};
});

vi.mock("@/actions/join-waitlist", () => ({
	addToWaitlist: mockAddToWaitlist,
	waitlistSchema: {
		parse: vi.fn(),
	},
}));

vi.mock("@/utils/segment", () => ({
	analyticsIdentify: mockAnalyticsIdentify,
}));

vi.mock("sonner", async () => {
	return {
		toast: {
			error: mockError,
			success: mockSuccess,
		},
	};
});

describe("WaitlistForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSuccess.mockImplementation(() => {});
		mockError.mockImplementation(() => {});
		mockAnalyticsIdentify.mockResolvedValue(undefined);
	});

	it("renders the form correctly", () => {
		render(<WaitlistForm />);

		expect(screen.getByTestId("test-form-input-email")).toBeInTheDocument();
		expect(screen.getByTestId("test-form-input-name")).toBeInTheDocument();

		expect(screen.getByRole("button", { name: /join now/i })).toBeInTheDocument();
	});

	it("should handle successful submission", async () => {
		mockAddToWaitlist.mockResolvedValue({
			code: WAITING_LIST_RESPONSE_CODES.SUCCESS,
		});

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByTestId("test-form-input-email");
		const nameInput = screen.getByTestId("test-form-input-name");
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "john.doe@example.com");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockAddToWaitlist).toHaveBeenCalledWith({
				email: "john.doe@example.com",
				name: "John Doe",
			});
		});

		await waitFor(() => {
			expect(mockSuccess).toHaveBeenCalled();
		});
	});

	it("should handle validation error with field errors", async () => {
		mockAddToWaitlist.mockResolvedValue({
			code: WAITING_LIST_RESPONSE_CODES.VALIDATION_ERROR,
			errors: {
				email: ["Please enter a valid email address"],
			},
		});

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByTestId("test-form-input-email");
		const nameInput = screen.getByTestId("test-form-input-name");
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "test@example.com");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockAddToWaitlist).toHaveBeenCalledWith({
				email: "test@example.com",
				name: "John Doe",
			});
		});

		await waitFor(() => {
			expect(screen.getByText(/Please check your information and try again/i)).toBeInTheDocument();
		});
	});

	it("should handle server error response", async () => {
		mockAddToWaitlist.mockResolvedValue({
			code: WAITING_LIST_RESPONSE_CODES.SERVER_ERROR,
			error: "Server error occurred",
		});

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByTestId("test-form-input-email");
		const nameInput = screen.getByTestId("test-form-input-name");
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "test@example.com");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockAddToWaitlist).toHaveBeenCalledWith({
				email: "test@example.com",
				name: "John Doe",
			});
		});

		await waitFor(() => {
			expect(screen.getByText(/Something went wrong on our end/i)).toBeInTheDocument();
		});

		expect(mockError).not.toHaveBeenCalled();
	});

	it("should show loading state during form submission", async () => {
		let resolvePromise: (value: any) => void;
		const waitPromise = new Promise((resolve) => {
			resolvePromise = resolve;
		});

		mockAddToWaitlist.mockImplementation(() => waitPromise);

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByTestId("test-form-input-email");
		const nameInput = screen.getByTestId("test-form-input-name");
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "test@example.com");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		expect(screen.getByText(/Sending your details/i)).toBeInTheDocument();

		expect(submitButton).toBeDisabled();

		resolvePromise!({ code: WAITING_LIST_RESPONSE_CODES.SUCCESS });

		await waitFor(() => {
			expect(mockSuccess).toHaveBeenCalled();
		});
	});

	it("should reset the form after successful submission", async () => {
		mockAddToWaitlist.mockResolvedValue({
			code: WAITING_LIST_RESPONSE_CODES.SUCCESS,
		});

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByTestId("test-form-input-email");
		const nameInput = screen.getByTestId("test-form-input-name");
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "test@example.com");
		await user.type(nameInput, "John Doe");

		expect((emailInput as HTMLInputElement).value).toBe("test@example.com");

		expect((nameInput as HTMLInputElement).value).toBe("John Doe");

		await user.click(submitButton);

		await waitFor(() => {
			expect(mockAddToWaitlist).toHaveBeenCalled();
		});

		await waitFor(() => {
			expect((emailInput as HTMLInputElement).value).toBe("");

			expect((nameInput as HTMLInputElement).value).toBe("");
		});
	});

	it("should validate email format", async () => {
		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByTestId("test-form-input-email");
		const nameInput = screen.getByTestId("test-form-input-name");
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "invalid-email");
		await user.type(nameInput, "John Doe");

		await user.click(submitButton);

		mockAddToWaitlist.mockResolvedValue({
			code: WAITING_LIST_RESPONSE_CODES.VALIDATION_ERROR,
			errors: {
				email: ["Please enter a valid email address"],
			},
		});

		expect(submitButton).toBeDisabled();
	});

	it("should validate name length", async () => {
		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByTestId("test-form-input-email");
		const nameInput = screen.getByTestId("test-form-input-name");
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "valid@example.com");
		await user.type(nameInput, "J");

		await user.click(submitButton);

		mockAddToWaitlist.mockResolvedValue({
			code: WAITING_LIST_RESPONSE_CODES.VALIDATION_ERROR,
			errors: {
				name: ["Name must be at least 2 characters long"],
			},
		});

		expect(submitButton).toBeDisabled();
	});

	it("should display the spinner during loading state", async () => {
		let resolvePromise: (value: any) => void;
		const waitPromise = new Promise((resolve) => {
			resolvePromise = resolve;
		});

		mockAddToWaitlist.mockImplementation(() => waitPromise);

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByTestId("test-form-input-email");
		const nameInput = screen.getByTestId("test-form-input-name");
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "test@example.com");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		expect(screen.getByText(/sending your details/i)).toBeInTheDocument();
		expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();

		resolvePromise!({ code: WAITING_LIST_RESPONSE_CODES.SUCCESS });

		await waitFor(() => {
			expect(mockSuccess).toHaveBeenCalled();
		});
	});
});
