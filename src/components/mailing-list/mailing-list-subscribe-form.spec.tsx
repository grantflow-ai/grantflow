import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { subscribeToMailingList } from "@/actions/mailing-list";
import { toast } from "sonner";
import { SubscribeToMailingListForm } from "./mailing-list-subscribe-form";
vi.mock("@/actions/mailing-list");
vi.mock("sonner");

describe("SubscribeForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the form correctly", () => {
		render(<SubscribeToMailingListForm />);

		expect(screen.getByTestId("subscribe-form-email-input")).toBeInTheDocument();
		expect(screen.getByTestId("subscribe-form-submit-button")).toBeInTheDocument();
	});

	it("disables submit button when form is invalid", () => {
		render(<SubscribeToMailingListForm />);

		const submitButton = screen.getByTestId("subscribe-form-submit-button");
		expect(submitButton).toBeDisabled();
	});

	it("enables submit button when form is valid", async () => {
		render(<SubscribeToMailingListForm />);

		const emailInput = screen.getByTestId("subscribe-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("subscribe-form-submit-button");
		await waitFor(() => {
			expect(submitButton).not.toBeDisabled();
		});
	});

	it("calls subscribeToMailingList with correct email on form submission", async () => {
		const mockSubscribeToMailingList = vi.mocked(subscribeToMailingList);
		mockSubscribeToMailingList.mockResolvedValueOnce(null);

		render(<SubscribeToMailingListForm />);

		const emailInput = screen.getByTestId("subscribe-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("subscribe-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockSubscribeToMailingList).toHaveBeenCalledWith("test@example.com");
		});
	});

	it("displays success toast when subscription is successful", async () => {
		const mockSubscribeToMailingList = vi.mocked(subscribeToMailingList);
		mockSubscribeToMailingList.mockResolvedValueOnce(null);

		render(<SubscribeToMailingListForm />);

		const emailInput = screen.getByTestId("subscribe-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("subscribe-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Successfully subscribed to the mailing list!", {
				duration: 3000,
			});
		});
	});

	it("displays error toast when subscription fails", async () => {
		const mockSubscribeToMailingList = vi.mocked(subscribeToMailingList);
		const errorMessage = "Invalid email address";
		mockSubscribeToMailingList.mockResolvedValueOnce(errorMessage);

		render(<SubscribeToMailingListForm />);

		const emailInput = screen.getByTestId("subscribe-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("subscribe-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(vi.mocked(toast.error)).toHaveBeenCalledWith(errorMessage, {
				duration: 3000,
			});
		});
	});

	it("shows loading state on submit button while form is submitting", async () => {
		const errorMessage = "Invalid email address";
		vi.mocked(subscribeToMailingList).mockImplementationOnce(
			() =>
				new Promise((resolve) =>
					setTimeout(() => {
						resolve(errorMessage);
					}, 5),
				),
		);

		render(<SubscribeToMailingListForm />);

		const emailInput = screen.getByTestId("subscribe-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("subscribe-form-submit-button");
		await userEvent.click(submitButton);

		expect(submitButton).toHaveAttribute("aria-busy", "true");
	});

	it("maintains the email input value after failed submission", async () => {
		const errorMessage = "Invalid email address";

		const mockSubscribeToMailingList = vi.mocked(subscribeToMailingList);
		mockSubscribeToMailingList.mockResolvedValueOnce(errorMessage);

		render(<SubscribeToMailingListForm />);

		const emailInput = screen.getByTestId("subscribe-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("subscribe-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(emailInput).toHaveValue("test@example.com");
		});
	});

	it("renders thank you message after successful subscription", async () => {
		const errorMessage = "Invalid email address";
		const mockSubscribeToMailingList = vi.mocked(subscribeToMailingList);
		mockSubscribeToMailingList.mockResolvedValueOnce(errorMessage);

		render(<SubscribeToMailingListForm />);

		const emailInput = screen.getByTestId("subscribe-form-email-input");
		await userEvent.type(emailInput, "test@example.com");

		const submitButton = screen.getByTestId("subscribe-form-submit-button");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByTestId("waiting-list-thank-you")).toBeInTheDocument();
		});
	});
});
