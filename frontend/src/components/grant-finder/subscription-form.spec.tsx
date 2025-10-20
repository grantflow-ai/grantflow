import { GrantSubscriptionResponseFactory, SearchParamsFactory } from "::testing/factories";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as grantsActions from "@/actions/grants";
import { SubscriptionForm } from "./subscription-form";

vi.mock("@/actions/grants");

describe.sequential("SubscriptionForm", () => {
	const mockCreateSubscription = vi.mocked(grantsActions.createSubscription);
	const user = userEvent.setup();

	beforeEach(() => {
		mockCreateSubscription.mockClear();
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	describe("Initial rendering", () => {
		it("renders subscription form with testid", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["CRISPR"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			expect(screen.getByTestId("subscription-form")).toBeInTheDocument();
		});

		it("renders form header with correct content", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["research"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			expect(screen.getByTestId("subscription-header")).toBeInTheDocument();
			expect(screen.getByTestId("subscription-header")).toHaveTextContent("Get Grant Alerts");
			expect(
				screen.getByText(
					"Never miss a grant opportunity. We'll email you when new grants matching your search criteria are posted.",
				),
			).toBeInTheDocument();
		});

		it("renders email input with correct attributes", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["medicine"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			expect(emailInput).toBeInTheDocument();
			expect(emailInput).toHaveAttribute("type", "email");
			expect(emailInput).toHaveAttribute("placeholder", "your.email@university.edu");
			expect(emailInput).toHaveAttribute("id", "subscription-email");
		});

		it("renders submit button with correct initial state", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["biology"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			const submitButton = screen.getByTestId("subscription-submit-button");
			expect(submitButton).toBeInTheDocument();
			expect(submitButton).toHaveAttribute("type", "submit");
			expect(submitButton).toHaveTextContent("Subscribe to Alerts");
			expect(submitButton).not.toBeDisabled();
		});

		it("renders form element with proper onSubmit", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["chemistry"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			expect(screen.getByTestId("subscription-form-element")).toBeInTheDocument();
		});
	});

	describe("Form interaction", () => {
		it("updates email input value when typed", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["physics"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "test@university.edu");

			expect(emailInput).toHaveValue("test@university.edu");
		});

		it("clears email input when cleared", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["engineering"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "temp@example.com");
			expect(emailInput).toHaveValue("temp@example.com");

			await user.clear(emailInput);
			expect(emailInput).toHaveValue("");
		});

		it("allows typing special characters in email", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["neuroscience"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			const complexEmail = "test.user+label@sub-domain.university.edu";
			await user.type(emailInput, complexEmail);

			expect(emailInput).toHaveValue(complexEmail);
		});
	});

	describe("Form validation", () => {
		it("shows error when email is empty", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["validation"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			expect(screen.getByTestId("subscription-error")).toBeInTheDocument();
			expect(screen.getByText("Please enter your email address")).toBeInTheDocument();
		});

		it("does not show error initially", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["initial"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			expect(screen.queryByTestId("subscription-error")).not.toBeInTheDocument();
		});

		it("clears error when email is entered after validation error", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["recovery"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			expect(screen.getByTestId("subscription-error")).toBeInTheDocument();

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "valid@email.com");

			const mockResponse = GrantSubscriptionResponseFactory.build();
			mockCreateSubscription.mockResolvedValue(mockResponse);

			await user.click(submitButton);

			expect(screen.queryByTestId("subscription-error")).not.toBeInTheDocument();
		});
	});

	describe("Form submission", () => {
		it("submits form with correct data", async () => {
			const searchParams = SearchParamsFactory.build({
				activityCodes: ["R01", "R21"],
				careerStage: ["Early-stage (≤ 10 yrs)"],
				email: "researcher@university.edu",
				institutionLocation: ["U.S. institution (no foreign component)"],
				keywords: ["CRISPR", "gene editing"],
			});

			const mockResponse = GrantSubscriptionResponseFactory.build();
			mockCreateSubscription.mockResolvedValue(mockResponse);

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "test@research.edu");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			expect(mockCreateSubscription).toHaveBeenCalledWith({
				email: "test@research.edu",
				search_params: {
					category: "",
					deadline_after: "",
					deadline_before: "",
					limit: 20,
					max_amount: 0,
					min_amount: 0,
					offset: 0,
					query: "CRISPR gene editing",
				},
			});
		});

		it("converts keywords array to query string", async () => {
			const searchParams = SearchParamsFactory.build({
				keywords: ["machine learning", "artificial intelligence", "deep learning"],
			});

			const mockResponse = GrantSubscriptionResponseFactory.build();
			mockCreateSubscription.mockResolvedValue(mockResponse);

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "ai@research.edu");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			expect(mockCreateSubscription).toHaveBeenCalledWith(
				expect.objectContaining({
					search_params: expect.objectContaining({
						query: "machine learning artificial intelligence deep learning",
					}),
				}),
			);
		});

		it("shows loading state during submission", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["loading"] });

			mockCreateSubscription.mockImplementation(() => new Promise(() => {}));

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "loading@test.com");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			expect(submitButton).toBeDisabled();
			expect(screen.getByText("Subscribing...")).toBeInTheDocument();
			expect(screen.getByRole("progressbar")).toBeInTheDocument();
		});

		it("disables email input during submission", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["disabled"] });

			mockCreateSubscription.mockImplementation(() => new Promise(() => {}));

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "disabled@test.com");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			expect(emailInput).toBeDisabled();
		});

		it("clears email after successful submission", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["success"] });

			const mockResponse = GrantSubscriptionResponseFactory.build();
			mockCreateSubscription.mockResolvedValue(mockResponse);

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "success@test.com");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByTestId("subscription-success")).toBeInTheDocument();
			});
		});
	});

	describe("Success state", () => {
		it("shows success message after successful submission", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["successful"] });

			const mockResponse = GrantSubscriptionResponseFactory.build();
			mockCreateSubscription.mockResolvedValue(mockResponse);

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "successful@test.com");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByTestId("subscription-success")).toBeInTheDocument();
				expect(screen.getByTestId("success-title")).toHaveTextContent("Success! You're subscribed");
				expect(screen.getByTestId("success-message")).toHaveTextContent(
					"We'll notify you when new grants matching your criteria become available.",
				);
			});
		});

		it("hides original form when success state is shown", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["replaced"] });

			const mockResponse = GrantSubscriptionResponseFactory.build();
			mockCreateSubscription.mockResolvedValue(mockResponse);

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "replaced@test.com");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByTestId("subscription-success")).toBeInTheDocument();
				expect(screen.queryByTestId("subscription-form-element")).not.toBeInTheDocument();
			});
		});

		it("shows success state with proper styling", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["styling"] });

			const mockResponse = GrantSubscriptionResponseFactory.build();
			mockCreateSubscription.mockResolvedValue(mockResponse);

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "styling@test.com");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			await waitFor(() => {
				const successContainer = screen.getByTestId("subscription-success");
				expect(successContainer).toHaveClass("border-green-200", "bg-green-50");
				expect(screen.getByTestId("success-title")).toHaveClass("text-green-900");
				expect(screen.getByTestId("success-message")).toHaveClass("text-green-700");
			});
		});
	});

	describe("Error handling", () => {
		it("shows error message when submission fails", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["error"] });

			mockCreateSubscription.mockRejectedValue(new Error("API Error"));

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "error@test.com");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByTestId("subscription-error")).toBeInTheDocument();
				expect(screen.getByText("Failed to create subscription. Please try again.")).toBeInTheDocument();
			});
		});

		it("re-enables form after submission error", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["recovery"] });

			mockCreateSubscription.mockRejectedValue(new Error("Network Error"));

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "recovery@test.com");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByTestId("subscription-error")).toBeInTheDocument();
				expect(submitButton).not.toBeDisabled();
				expect(emailInput).not.toBeDisabled();
			});
		});

		it("preserves email value after submission error", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["preserve"] });

			mockCreateSubscription.mockRejectedValue(new Error("Server Error"));

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "preserve@test.com");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByTestId("subscription-error")).toBeInTheDocument();
				expect(emailInput).toHaveValue("preserve@test.com");
			});
		});

		it("allows retry after error", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["retry"] });

			mockCreateSubscription
				.mockRejectedValueOnce(new Error("First attempt failed"))
				.mockResolvedValueOnce(GrantSubscriptionResponseFactory.build());

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "retry@test.com");

			const submitButton = screen.getByTestId("subscription-submit-button");

			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByTestId("subscription-error")).toBeInTheDocument();
			});

			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByTestId("subscription-success")).toBeInTheDocument();
			});
		});
	});

	describe("Edge cases", () => {
		it("handles empty keywords array", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: [] });

			const mockResponse = GrantSubscriptionResponseFactory.build();
			mockCreateSubscription.mockResolvedValue(mockResponse);

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "empty@test.com");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			expect(mockCreateSubscription).toHaveBeenCalledWith(
				expect.objectContaining({
					search_params: expect.objectContaining({
						query: "",
					}),
				}),
			);
		});

		it("handles very long email addresses", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["long"] });

			const longEmail = "very.long.email.address.that.exceeds.normal.length@very-long-university-domain-name.edu";

			const mockResponse = GrantSubscriptionResponseFactory.build();
			mockCreateSubscription.mockResolvedValue(mockResponse);

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, longEmail);

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			expect(mockCreateSubscription).toHaveBeenCalledWith(
				expect.objectContaining({
					email: longEmail,
				}),
			);
		});

		it("handles special characters in keywords", async () => {
			const searchParams = SearchParamsFactory.build({
				keywords: ["CRISPR-Cas9", "α-synuclein", "β-amyloid"],
			});

			const mockResponse = GrantSubscriptionResponseFactory.build();
			mockCreateSubscription.mockResolvedValue(mockResponse);

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			await user.type(emailInput, "special@test.com");

			const submitButton = screen.getByTestId("subscription-submit-button");
			await user.click(submitButton);

			expect(mockCreateSubscription).toHaveBeenCalledWith(
				expect.objectContaining({
					search_params: expect.objectContaining({
						query: "CRISPR-Cas9 α-synuclein β-amyloid",
					}),
				}),
			);
		});
	});

	describe("Accessibility", () => {
		it("has proper form structure", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["accessibility"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			const form = screen.getByTestId("subscription-form-element");
			expect(form.tagName).toBe("FORM");

			const label = screen.getByLabelText("Email address");
			expect(label).toBeInTheDocument();
		});

		it("has proper label association", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["labels"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			const label = screen.getByLabelText("Email address");

			expect(label).toBe(emailInput);
		});

		it("has screen reader only label", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["screen-reader"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			const label = screen.getByText("Email address");
			expect(label).toHaveClass("sr-only");
		});

		it("has proper button attributes", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["button-attrs"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			const submitButton = screen.getByTestId("subscription-submit-button");
			expect(submitButton).toHaveAttribute("type", "submit");
		});

		it("shows proper disabled states", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["disabled-states"] });

			mockCreateSubscription.mockImplementation(() => new Promise(() => {}));

			render(<SubscriptionForm searchParams={searchParams} />);

			const emailInput = screen.getByTestId("subscription-email-input");
			const submitButton = screen.getByTestId("subscription-submit-button");

			await user.type(emailInput, "disabled@test.com");
			await user.click(submitButton);

			expect(emailInput).toHaveClass("disabled:cursor-not-allowed", "disabled:opacity-50");
			expect(submitButton).toHaveClass("disabled:cursor-not-allowed", "disabled:opacity-50");
		});
	});

	describe("Legal text", () => {
		it("displays subscription agreement text", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["legal"] });
			render(<SubscriptionForm searchParams={searchParams} />);

			expect(
				screen.getByText(
					"By subscribing, you agree to receive email notifications. You can unsubscribe at any time.",
				),
			).toBeInTheDocument();
		});
	});
});
