import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WaitlistForm } from "@/components/landing-page/waitlist-form";

const { mockAnalyticsIdentify, mockError, mockSuccess } = vi.hoisted(() => {
	return {
		mockAnalyticsIdentify: vi.fn().mockResolvedValue(undefined),
		mockError: vi.fn(),
		mockSuccess: vi.fn(),
	};
});

vi.mock("@/utils/segment", () => ({
	analyticsIdentify: mockAnalyticsIdentify,
}));

vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
	},
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
		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByTestId("test-form-input-email");
		const nameInput = screen.getByTestId("test-form-input-name");
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "john.doe@example.com");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockAnalyticsIdentify).toHaveBeenCalledWith("john.doe@example.com", {
				email: "john.doe@example.com",
				firstName: "John",
				lastName: "Doe",
			});
		});

		await waitFor(() => {
			expect(mockSuccess).toHaveBeenCalledWith("Thank you! You've successfully joined the waitlist.");
		});
	});

	it("should handle submission error", async () => {
		mockAnalyticsIdentify.mockRejectedValueOnce(new Error("Failed to identify"));

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByTestId("test-form-input-email");
		const nameInput = screen.getByTestId("test-form-input-name");
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "test@example.com");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockAnalyticsIdentify).toHaveBeenCalledWith("test@example.com", {
				email: "test@example.com",
				firstName: "John",
				lastName: "Doe",
			});
		});

		await waitFor(() => {
			expect(screen.getByTestId("waitlist-form-message")).toHaveTextContent(
				/Please check your information and try again/i,
			);
		});

		expect(mockError).toHaveBeenCalledWith("Please check your information and try again.");
	});

	it("should show loading state during form submission", async () => {
		// Delay the resolution of analyticsIdentify to show loading state
		mockAnalyticsIdentify.mockImplementationOnce(
			() => new Promise((resolve) => setTimeout(() => resolve(undefined), 100)),
		);

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByTestId("test-form-input-email");
		const nameInput = screen.getByTestId("test-form-input-name");
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "test@example.com");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		expect(screen.getByTestId("waitlist-form-message")).toHaveTextContent(/Sending your details/i);
		expect(submitButton).toBeDisabled();
		expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();

		await waitFor(() => {
			expect(mockSuccess).toHaveBeenCalled();
		});
	});

	it("should reset the form after successful submission", async () => {
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
			expect(mockAnalyticsIdentify).toHaveBeenCalled();
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

		expect(submitButton).toBeDisabled();
	});

	it("should display the spinner during loading state", async () => {
		// Delay the resolution of analyticsIdentify to show loading state
		mockAnalyticsIdentify.mockImplementationOnce(
			() => new Promise((resolve) => setTimeout(() => resolve(undefined), 100)),
		);

		const user = userEvent.setup();
		render(<WaitlistForm />);

		const emailInput = screen.getByTestId("test-form-input-email");
		const nameInput = screen.getByTestId("test-form-input-name");
		const submitButton = screen.getByRole("button", { name: /join now/i });

		await user.type(emailInput, "test@example.com");
		await user.type(nameInput, "John Doe");
		await user.click(submitButton);

		expect(screen.getByTestId("waitlist-form-message")).toHaveTextContent(/Sending your details/i);
		expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();

		await waitFor(() => {
			expect(mockSuccess).toHaveBeenCalled();
		});
	});
});
