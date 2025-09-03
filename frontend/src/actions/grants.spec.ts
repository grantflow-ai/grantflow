import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClient } from "@/utils/api";
import { createSubscription, getGrantDetails, searchGrants, unsubscribe } from "./grants";

vi.mock("@/utils/api", () => ({
	getClient: vi.fn(),
}));

describe("grants", () => {
	let mockClient: any;
	const mockGetClient = vi.mocked(getClient);

	beforeEach(() => {
		vi.clearAllMocks();
		mockClient = {
			get: vi.fn(),
			post: vi.fn(),
		};
		mockGetClient.mockReturnValue(mockClient);
	});

	describe("searchGrants", () => {
		const mockGrantsResponse = [
			{
				activity_code: "R01",
				amount: "$500,000",
				amount_max: 500_000,
				amount_min: 100_000,
				category: "Medical Research",
				clinical_trials: "Yes",
				deadline: "2024-12-31",
				description: "Research grant for medical studies",
				document_number: "RFA-12345",
				document_type: "RFA",
				eligibility: "Universities and research institutions",
				expired_date: "2024-12-31",
				id: "grant-1",
				organization: "NIH",
				parent_organization: "HHS",
				participating_orgs: "All qualified organizations",
				release_date: "2024-01-01",
				title: "Research Grant 2024",
				url: "https://grants.gov/grant-1",
			},
		];

		it("should search grants without parameters", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockGrantsResponse),
			});

			const result = await searchGrants();

			expect(mockClient.get).toHaveBeenCalledWith("grants", {
				searchParams: expect.any(URLSearchParams),
			});

			// eslint-disable-next-line prefer-destructuring
			const searchParams = mockClient.get.mock.calls[0][1].searchParams;
			expect(searchParams.toString()).toBe("");
			expect(result).toEqual(mockGrantsResponse);
		});

		it("should search grants with all parameters", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockGrantsResponse),
			});

			const params = {
				category: "healthcare",
				deadline_after: "2024-01-01",
				deadline_before: "2024-12-31",
				limit: 20,
				max_amount: 500_000,
				min_amount: 10_000,
				offset: 0,
				search_query: "medical research",
			};

			const result = await searchGrants(params);

			expect(mockClient.get).toHaveBeenCalledWith("grants", {
				searchParams: expect.any(URLSearchParams),
			});

			// eslint-disable-next-line prefer-destructuring
			const searchParams = mockClient.get.mock.calls[0][1].searchParams;
			expect(searchParams.get("search_query")).toBe("medical research");
			expect(searchParams.get("category")).toBe("healthcare");
			expect(searchParams.get("min_amount")).toBe("10000");
			expect(searchParams.get("max_amount")).toBe("500000");
			expect(searchParams.get("deadline_after")).toBe("2024-01-01");
			expect(searchParams.get("deadline_before")).toBe("2024-12-31");
			expect(searchParams.get("limit")).toBe("20");
			expect(searchParams.get("offset")).toBe("0");
			expect(result).toEqual(mockGrantsResponse);
		});

		it("should filter out null and undefined parameters", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockGrantsResponse),
			});

			const params = {
				category: null,
				deadline_after: null,
				deadline_before: undefined,
				limit: 10,
				max_amount: 100_000,
				min_amount: undefined,
				search_query: "research",
			};

			await searchGrants(params);

			// eslint-disable-next-line prefer-destructuring
			const searchParams = mockClient.get.mock.calls[0][1].searchParams;
			expect(searchParams.get("search_query")).toBe("research");
			expect(searchParams.get("category")).toBeNull();
			expect(searchParams.get("min_amount")).toBeNull();
			expect(searchParams.get("max_amount")).toBe("100000");
			expect(searchParams.get("deadline_after")).toBeNull();
			expect(searchParams.get("deadline_before")).toBeNull();
			expect(searchParams.get("limit")).toBe("10");
			expect(searchParams.get("offset")).toBeNull();
		});

		it("should handle API errors correctly", async () => {
			const error = new Error("Search failed");
			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(error),
			});

			await expect(searchGrants()).rejects.toThrow("Search failed");
		});

		it("should handle empty response", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue([]),
			});

			const result = await searchGrants();

			expect(result).toEqual([]);
		});

		it("should handle numeric parameters correctly", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockGrantsResponse),
			});

			await searchGrants({
				limit: 50,
				max_amount: 1_000_000,
				min_amount: 0,
				offset: 100,
			});

			// eslint-disable-next-line prefer-destructuring
			const searchParams = mockClient.get.mock.calls[0][1].searchParams;
			expect(searchParams.get("min_amount")).toBe("0");
			expect(searchParams.get("max_amount")).toBe("1000000");
			expect(searchParams.get("limit")).toBe("50");
			expect(searchParams.get("offset")).toBe("100");
		});
	});

	describe("getGrantDetails", () => {
		const mockGrantDetails = {
			activity_code: "R01",
			amount: "$500,000",
			amount_max: 500_000,
			amount_min: 100_000,
			category: "Medical Research",
			clinical_trials: "Yes",
			deadline: "2024-12-31",
			description: "Detailed research grant for medical studies",
			document_number: "RFA-12345",
			document_type: "RFA",
			eligibility: "Universities and research institutions",
			expired_date: "2024-12-31",
			id: "grant-1",
			organization: "NIH",
			parent_organization: "HHS",
			participating_orgs: "All qualified organizations",
			release_date: "2024-01-01",
			title: "Research Grant 2024",
			url: "https://grants.gov/grant-1",
		};

		it("should get grant details with correct parameters", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockGrantDetails),
			});

			const grantId = "grant-123";
			const result = await getGrantDetails(grantId);

			expect(mockClient.get).toHaveBeenCalledWith(`grants/${grantId}`);
			expect(result).toEqual(mockGrantDetails);
		});

		it("should handle API errors correctly", async () => {
			const error = new Error("Grant not found");
			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(error),
			});

			await expect(getGrantDetails("invalid-id")).rejects.toThrow("Grant not found");
		});

		it("should handle empty grant details", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue({}),
			});

			const result = await getGrantDetails("grant-123");

			expect(result).toEqual({});
		});

		it("should handle different grant ID formats", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockGrantDetails),
			});

			const grantIds = ["grant-123", "RFA-12345", "uuid-format-id", "12345"];

			for (const grantId of grantIds) {
				await getGrantDetails(grantId);
				expect(mockClient.get).toHaveBeenCalledWith(`grants/${grantId}`);
			}
		});
	});

	describe("createSubscription", () => {
		const mockSubscriptionResponse = {
			message: "Subscription created successfully. Please check your email to verify.",
			subscription_id: "sub-123",
			verification_required: true,
		};

		const mockSubscriptionRequest = {
			email: "user@example.com",
			frequency: "weekly",
			search_params: {
				category: "medical",
				deadline_after: "2024-01-01",
				deadline_before: "2024-12-31",
				limit: 10,
				max_amount: 500_000,
				min_amount: 10_000,
				offset: 0,
				query: "research grant",
			},
		};

		it("should create subscription with correct parameters", async () => {
			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockSubscriptionResponse),
			});

			const result = await createSubscription(mockSubscriptionRequest);

			expect(mockClient.post).toHaveBeenCalledWith("grants/subscribe", {
				json: mockSubscriptionRequest,
			});
			expect(result).toEqual(mockSubscriptionResponse);
		});

		it("should handle API errors correctly", async () => {
			const error = new Error("Invalid email address");
			mockClient.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(error),
			});

			await expect(createSubscription(mockSubscriptionRequest)).rejects.toThrow("Invalid email address");
		});

		it("should handle different subscription frequencies", async () => {
			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockSubscriptionResponse),
			});

			const frequencies = ["daily", "weekly", "monthly"];

			for (const frequency of frequencies) {
				const request = { ...mockSubscriptionRequest, frequency };
				await createSubscription(request);

				expect(mockClient.post).toHaveBeenCalledWith("grants/subscribe", {
					json: request,
				});
			}
		});

		it("should handle subscription without frequency", async () => {
			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockSubscriptionResponse),
			});

			const requestWithoutFrequency = {
				email: mockSubscriptionRequest.email,
				search_params: mockSubscriptionRequest.search_params,
			};
			await createSubscription(requestWithoutFrequency);

			expect(mockClient.post).toHaveBeenCalledWith("grants/subscribe", {
				json: requestWithoutFrequency,
			});
		});

		it("should validate request body structure", async () => {
			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockSubscriptionResponse),
			});

			await createSubscription(mockSubscriptionRequest);

			const calledWith = mockClient.post.mock.calls[0][1].json;
			expect(calledWith).toEqual(
				expect.objectContaining({
					email: expect.any(String),
					search_params: expect.objectContaining({
						category: expect.any(String),
						deadline_after: expect.any(String),
						deadline_before: expect.any(String),
						limit: expect.any(Number),
						max_amount: expect.any(Number),
						min_amount: expect.any(Number),
						offset: expect.any(Number),
						query: expect.any(String),
					}),
				}),
			);
		});

		it("should handle subscription response without verification", async () => {
			const responseWithoutVerification = {
				message: "Subscription created successfully.",
				subscription_id: "sub-456",
				verification_required: false,
			};

			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseWithoutVerification),
			});

			const result = await createSubscription(mockSubscriptionRequest);

			if (typeof result === "object" && "verification_required" in result) {
				expect(result.verification_required).toBe(false);
			}
			expect(result).toEqual(responseWithoutVerification);
		});
	});

	describe("unsubscribe", () => {
		const mockUnsubscribeResponse = {};

		it("should unsubscribe with correct parameters", async () => {
			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockUnsubscribeResponse),
			});

			const email = "user@example.com";
			const result = await unsubscribe(email);

			expect(mockClient.post).toHaveBeenCalledWith("grants/unsubscribe", {
				searchParams: {
					email,
				},
			});
			expect(result).toEqual(mockUnsubscribeResponse);
		});

		it("should handle API errors correctly", async () => {
			const error = new Error("Email not found in subscriptions");
			mockClient.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(error),
			});

			await expect(unsubscribe("nonexistent@example.com")).rejects.toThrow("Email not found in subscriptions");
		});

		it("should handle different email formats", async () => {
			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockUnsubscribeResponse),
			});

			const emails = [
				"simple@example.com",
				"user.with.dots@example.com",
				"user+tag@example.co.uk",
				"user_underscore@domain.org",
			];

			for (const email of emails) {
				await unsubscribe(email);

				expect(mockClient.post).toHaveBeenCalledWith("grants/unsubscribe", {
					searchParams: {
						email,
					},
				});
			}
		});

		it("should handle invalid email format errors", async () => {
			const invalidEmailError = new Error("Invalid email format");
			mockClient.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(invalidEmailError),
			});

			await expect(unsubscribe("invalid-email")).rejects.toThrow("Invalid email format");
		});

		it("should encode email in search params correctly", async () => {
			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockUnsubscribeResponse),
			});

			const emailWithSpecialChars = "user+test@example.com";
			await unsubscribe(emailWithSpecialChars);

			// eslint-disable-next-line prefer-destructuring
			const searchParams = mockClient.post.mock.calls[0][1].searchParams;
			expect(searchParams.email).toBe(emailWithSpecialChars);
		});
	});

	describe("error scenarios", () => {
		it("should handle 400 Bad Request errors", async () => {
			const badRequestError = {
				message: "Bad Request",
				response: {
					json: () =>
						Promise.resolve({
							detail: "Invalid request parameters",
							status_code: 400,
						}),
					status: 400,
				},
			};

			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(badRequestError),
			});

			await expect(searchGrants({ min_amount: -100 })).rejects.toEqual(badRequestError);
		});

		it("should handle 404 Not Found errors", async () => {
			const notFoundError = {
				message: "Not Found",
				response: {
					json: () =>
						Promise.resolve({
							detail: "Grant not found",
							status_code: 404,
						}),
					status: 404,
				},
			};

			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(notFoundError),
			});

			await expect(getGrantDetails("non-existent-id")).rejects.toEqual(notFoundError);
		});

		it("should handle 500 Internal Server errors", async () => {
			const serverError = {
				message: "Internal Server Error",
				response: {
					json: () =>
						Promise.resolve({
							detail: "Internal server error",
							status_code: 500,
						}),
					status: 500,
				},
			};

			mockClient.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(serverError),
			});

			const mockRequestData = {
				email: "test@example.com",
				search_params: {
					category: "medical",
					deadline_after: "2024-01-01",
					deadline_before: "2024-12-31",
					limit: 10,
					max_amount: 100_000,
					min_amount: 10_000,
					offset: 0,
					query: "research",
				},
			};

			await expect(createSubscription(mockRequestData)).rejects.toEqual(serverError);
		});

		it("should handle network errors", async () => {
			const networkError = new Error("Network error");

			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(networkError),
			});

			await expect(searchGrants()).rejects.toThrow("Network error");
		});

		it("should handle timeout errors", async () => {
			const timeoutError = new Error("Request timeout");

			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(timeoutError),
			});

			await expect(getGrantDetails("grant-123")).rejects.toThrow("Request timeout");
		});
	});

	describe("request validation", () => {
		it("should call getClient for all functions", async () => {
			const mockJson = vi.fn().mockResolvedValue({});
			mockClient.get.mockReturnValue({ json: mockJson });
			mockClient.post.mockReturnValue({ json: mockJson });

			const mockRequestData = {
				email: "test@example.com",
				search_params: {
					category: "medical",
					deadline_after: "2024-01-01",
					deadline_before: "2024-12-31",
					limit: 10,
					max_amount: 100_000,
					min_amount: 10_000,
					offset: 0,
					query: "research",
				},
			};

			await searchGrants();
			await getGrantDetails("grant-123");
			await createSubscription(mockRequestData);
			await unsubscribe("test@example.com");

			expect(mockGetClient).toHaveBeenCalledTimes(4);
		});

		it("should use correct HTTP methods", async () => {
			const mockJson = vi.fn().mockResolvedValue({});
			mockClient.get.mockReturnValue({ json: mockJson });
			mockClient.post.mockReturnValue({ json: mockJson });

			const mockRequestData = {
				email: "test@example.com",
				search_params: {
					category: "medical",
					deadline_after: "2024-01-01",
					deadline_before: "2024-12-31",
					limit: 10,
					max_amount: 100_000,
					min_amount: 10_000,
					offset: 0,
					query: "research",
				},
			};

			await searchGrants();
			await getGrantDetails("grant-123");

			expect(mockClient.get).toHaveBeenCalledTimes(3);

			await createSubscription(mockRequestData);
			await unsubscribe("test@example.com");

			expect(mockClient.post).toHaveBeenCalledTimes(2);
		});

		it("should use correct endpoint URLs", async () => {
			const mockJson = vi.fn().mockResolvedValue({});
			mockClient.get.mockReturnValue({ json: mockJson });
			mockClient.post.mockReturnValue({ json: mockJson });

			const mockRequestData = {
				email: "test@example.com",
				search_params: {
					category: "medical",
					deadline_after: "2024-01-01",
					deadline_before: "2024-12-31",
					limit: 10,
					max_amount: 100_000,
					min_amount: 10_000,
					offset: 0,
					query: "research",
				},
			};

			await searchGrants();
			expect(mockClient.get).toHaveBeenCalledWith("grants", expect.any(Object));

			await getGrantDetails("grant-123");
			expect(mockClient.get).toHaveBeenCalledWith("grants/grant-123");

			await createSubscription(mockRequestData);
			expect(mockClient.post).toHaveBeenCalledWith("grants/subscribe", expect.any(Object));

			await unsubscribe("test@example.com");
			expect(mockClient.post).toHaveBeenCalledWith("grants/unsubscribe", expect.any(Object));
		});
	});
});
