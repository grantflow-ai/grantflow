import { mockCookies, mockEnv, mockRedirect } from "::testing/global-mocks";
import { HTTPError, type NormalizedOptions } from "ky";

import { COOKIE_CONSENT, SESSION_COOKIE } from "@/constants";
import type { CookieConsentData } from "@/hooks/use-cookie-consent";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger/server";
import { routes } from "@/utils/navigation";
import {
	checkCookieConsent,
	createAuthHeaders,
	redirectWithToastParams,
	withAuthRedirect,
	withErrorToast,
} from "./server-side";

vi.mock("@/utils/logger/server", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("@/utils/env", () => ({
	getEnv: vi.fn(),
}));

describe("Server-side Utils", () => {
	const mockCookieStore = {
		get: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockCookies.mockResolvedValue(mockCookieStore);
		vi.mocked(getEnv).mockReturnValue({
			...mockEnv,
		});
	});

	describe("redirectWithToastParams", () => {
		it("should redirect with correct toast query parameters", async () => {
			await redirectWithToastParams({
				message: "Operation successful",
				path: "/dashboard",
				type: "success",
			});

			expect(mockRedirect).toHaveBeenCalledWith("/dashboard?toastType=success&toastContent=Operation successful");
		});

		it("should handle different toast types", async () => {
			await redirectWithToastParams({
				message: "Something went wrong",
				path: "/projects",
				type: "error",
			});

			expect(mockRedirect).toHaveBeenCalledWith("/projects?toastType=error&toastContent=Something went wrong");
		});

		it("should handle info type", async () => {
			await redirectWithToastParams({
				message: "Information message",
				path: "/dashboard",
				type: "info",
			});

			expect(mockRedirect).toHaveBeenCalledWith("/dashboard?toastType=info&toastContent=Information message");
		});

		it("should handle messages with special characters", async () => {
			await redirectWithToastParams({
				message: "Failed to save: Invalid & malformed data",
				path: "/settings",
				type: "error",
			});

			expect(mockRedirect).toHaveBeenCalledWith(
				"/settings?toastType=error&toastContent=Failed to save: Invalid & malformed data",
			);
		});
	});

	describe("withErrorToast", () => {
		it("should return the value when promise resolves successfully", async () => {
			const expectedValue = { id: 1, name: "Test" };
			const successPromise = Promise.resolve(expectedValue);

			const result = await withErrorToast({
				identifier: "test-operation",
				message: "Operation failed",
				path: "/dashboard",
				value: successPromise,
			});

			expect(result).toEqual(expectedValue);
			expect(vi.mocked(log.error)).not.toHaveBeenCalled();
			expect(mockRedirect).not.toHaveBeenCalled();
		});

		it("should log error and redirect when promise rejects", async () => {
			const testError = new Error("Something went wrong");
			const failingPromise = Promise.reject(testError);

			await expect(
				withErrorToast({
					identifier: "create-user",
					message: "Failed to create user",
					path: "/dashboard",
					value: failingPromise,
				}),
			).rejects.toThrow("Something went wrong");

			expect(vi.mocked(log.error)).toHaveBeenCalledWith("create-user", testError);

			expect(mockRedirect).toHaveBeenCalledWith("/dashboard?toastType=error&toastContent=Failed to create user");
		});

		it("should handle different error types", async () => {
			const mockRequest = { method: "POST", url: "https://api.test.com/users" };
			const mockResponse = new Response("", { status: 500 });
			const customError = new HTTPError(mockResponse, mockRequest as never, {} as NormalizedOptions);
			const failingPromise = Promise.reject(customError);

			await expect(
				withErrorToast({
					identifier: "api-call",
					message: "API request failed",
					path: "/projects",
					value: failingPromise,
				}),
			).rejects.toThrow();

			expect(vi.mocked(log.error)).toHaveBeenCalledWith("api-call", customError);
		});

		it("should handle string errors", async () => {
			const failingPromise = Promise.reject(new Error("String error"));

			await expect(
				withErrorToast({
					identifier: "string-error",
					message: "String error occurred",
					path: "/settings",
					value: failingPromise,
				}),
			).rejects.toThrow("String error");

			expect(vi.mocked(log.error)).toHaveBeenCalledWith("string-error", new Error("String error"));
		});
	});

	describe("createAuthHeaders", () => {
		it("should return auth headers when session cookie exists", async () => {
			mockCookieStore.get.mockReturnValue({ value: "test-jwt-token" });

			const result = await createAuthHeaders();

			expect(mockCookieStore.get).toHaveBeenCalledWith(SESSION_COOKIE);
			expect(result).toEqual({
				Authorization: "Bearer test-jwt-token",
			});
			expect(mockRedirect).not.toHaveBeenCalled();
		});

		it("should redirect to onboarding when session cookie is missing", async () => {
			mockCookieStore.get.mockReturnValue(undefined);
			mockRedirect.mockImplementation(() => {
				throw new Error("NEXT_REDIRECT");
			});

			await expect(createAuthHeaders()).rejects.toThrow("NEXT_REDIRECT");

			expect(mockCookieStore.get).toHaveBeenCalledWith(SESSION_COOKIE);
			expect(mockRedirect).toHaveBeenCalledWith(routes.onboarding());
		});

		it("should redirect to onboarding when session cookie has no value", async () => {
			mockCookieStore.get.mockReturnValue({ value: "" });
			mockRedirect.mockImplementation(() => {
				throw new Error("NEXT_REDIRECT");
			});

			await expect(createAuthHeaders()).rejects.toThrow("NEXT_REDIRECT");

			expect(mockRedirect).toHaveBeenCalledWith(routes.onboarding());
		});

		it("should redirect to onboarding when session cookie has null value", async () => {
			mockCookieStore.get.mockReturnValue({ value: null });
			mockRedirect.mockImplementation(() => {
				throw new Error("NEXT_REDIRECT");
			});

			await expect(createAuthHeaders()).rejects.toThrow("NEXT_REDIRECT");

			expect(mockRedirect).toHaveBeenCalledWith(routes.onboarding());
		});
	});

	describe("checkCookieConsent", () => {
		it("should return true when valid consent cookie exists with consent given", async () => {
			const mockConsentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(mockConsentData) });

			const result = await checkCookieConsent();

			expect(mockCookieStore.get).toHaveBeenCalledWith(COOKIE_CONSENT);
			expect(result).toBe(true);
			expect(vi.mocked(log.warn)).not.toHaveBeenCalled();
		});

		it("should return false when no consent cookie exists", async () => {
			mockCookieStore.get.mockReturnValue(undefined);

			const result = await checkCookieConsent();

			expect(mockCookieStore.get).toHaveBeenCalledWith(COOKIE_CONSENT);
			expect(result).toBe(false);
			expect(vi.mocked(log.warn)).not.toHaveBeenCalled();
		});

		it("should return false when consent cookie has no value", async () => {
			mockCookieStore.get.mockReturnValue({ value: "" });

			const result = await checkCookieConsent();

			expect(result).toBe(false);
		});

		it("should return false when consent cookie has null value", async () => {
			mockCookieStore.get.mockReturnValue({ value: null });

			const result = await checkCookieConsent();

			expect(result).toBe(false);
		});

		it("should return false when consentGiven is false even if hasInteracted is true", async () => {
			const mockConsentData: CookieConsentData = {
				consentGiven: false,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(mockConsentData) });

			const result = await checkCookieConsent();

			expect(result).toBe(false);
		});

		it("should return false when hasInteracted is false even if consentGiven is true", async () => {
			const mockConsentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: false,
				preferences: { analytics: true, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(mockConsentData) });

			const result = await checkCookieConsent();

			expect(result).toBe(false);
		});

		it("should return false when both consentGiven and hasInteracted are false", async () => {
			const mockConsentData: CookieConsentData = {
				consentGiven: false,
				hasInteracted: false,
				preferences: { analytics: true, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(mockConsentData) });

			const result = await checkCookieConsent();

			expect(result).toBe(false);
		});

		it("should handle invalid JSON and log warning", async () => {
			mockCookieStore.get.mockReturnValue({ value: "invalid-json-{" });

			const result = await checkCookieConsent();

			expect(result).toBe(false);
			expect(vi.mocked(log.warn)).toHaveBeenCalledWith(
				"Invalid consent cookie format, clearing cookie",
				expect.objectContaining({
					cookie_name: COOKIE_CONSENT,
					error: expect.any(String),
				}),
			);
		});

		it("should handle corrupted JSON data structure", async () => {
			const corruptedData = { invalidProperty: "test", missing: "fields" };
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(corruptedData) });

			const result = await checkCookieConsent();

			expect(result).toBe(undefined);
		});

		it("should handle empty object as cookie value", async () => {
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify({}) });

			const result = await checkCookieConsent();

			expect(result).toBe(undefined);
		});

		it("should handle partial consent data", async () => {
			const partialData = { consentGiven: true };
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(partialData) });

			const result = await checkCookieConsent();

			expect(result).toBe(undefined);
		});

		it("should return true only when both consentGiven and hasInteracted are true", async () => {
			const validData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: false, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(validData) });

			const result = await checkCookieConsent();

			expect(result).toBe(true);
		});

		it("should handle non-Error objects thrown during JSON parsing", async () => {
			mockCookieStore.get.mockReturnValue({ value: "malformed" });

			const result = await checkCookieConsent();

			expect(result).toBe(false);
			expect(vi.mocked(log.warn)).toHaveBeenCalledWith(
				"Invalid consent cookie format, clearing cookie",
				expect.objectContaining({
					cookie_name: COOKIE_CONSENT,
					error: expect.any(String),
				}),
			);
		});
	});

	describe("withAuthRedirect", () => {
		it("should return the value when promise resolves successfully and consent is given", async () => {
			const expectedValue = { data: "test" };
			const successPromise = Promise.resolve(expectedValue);

			const mockConsentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(mockConsentData) });

			const result = await withAuthRedirect(successPromise);

			expect(result).toEqual(expectedValue);
			expect(mockRedirect).not.toHaveBeenCalled();
		});

		it("should redirect to onboarding when no cookie consent is given", async () => {
			const successPromise = Promise.resolve({ data: "test" });

			mockCookieStore.get.mockReturnValue(undefined);
			mockRedirect.mockImplementation(() => {
				throw new Error("NEXT_REDIRECT");
			});

			await expect(withAuthRedirect(successPromise)).rejects.toThrow("NEXT_REDIRECT");

			expect(mockCookieStore.get).toHaveBeenCalledWith(COOKIE_CONSENT);
			expect(mockRedirect).toHaveBeenCalledWith(routes.onboarding());
			expect(vi.mocked(log.warn)).toHaveBeenCalledWith(
				"No cookie consent found, redirecting to onboarding",
				expect.objectContaining({
					cookie_name: COOKIE_CONSENT,
					redirect_path: routes.onboarding(),
				}),
			);
		});

		it("should redirect to onboarding when consent is denied", async () => {
			const successPromise = Promise.resolve({ data: "test" });

			const deniedConsentData: CookieConsentData = {
				consentGiven: false,
				hasInteracted: true,
				preferences: { analytics: false, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(deniedConsentData) });
			mockRedirect.mockImplementation(() => {
				throw new Error("NEXT_REDIRECT");
			});

			await expect(withAuthRedirect(successPromise)).rejects.toThrow("NEXT_REDIRECT");

			expect(mockRedirect).toHaveBeenCalledWith(routes.onboarding());
		});

		it("should redirect to onboarding when user has not interacted with consent", async () => {
			const successPromise = Promise.resolve({ data: "test" });

			const noInteractionData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: false,
				preferences: { analytics: true, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(noInteractionData) });
			mockRedirect.mockImplementation(() => {
				throw new Error("NEXT_REDIRECT");
			});

			await expect(withAuthRedirect(successPromise)).rejects.toThrow("NEXT_REDIRECT");

			expect(mockRedirect).toHaveBeenCalledWith(routes.onboarding());
		});

		it("should redirect to onboarding on 401 HTTP errors when consent is given", async () => {
			const mockConsentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(mockConsentData) });

			const mockRequest = { method: "GET", url: "https://api.test.com/users" };
			const response = new Response("Unauthorized", { status: 401 });
			const httpError = new HTTPError(response, mockRequest as any, {} as NormalizedOptions);
			const failingPromise = Promise.reject(httpError);

			try {
				await withAuthRedirect(failingPromise);

				expect(true).toBe(false);
			} catch {
				expect(mockRedirect).toHaveBeenCalledWith(routes.onboarding());
			}
		});

		it("should rethrow 401 HTTP errors after redirecting when consent is given", async () => {
			const mockConsentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(mockConsentData) });

			const mockRequest = { method: "GET", url: "https://api.test.com/users" };
			const response = new Response("Unauthorized", { status: 401 });
			const httpError = new HTTPError(response, mockRequest as any, {} as NormalizedOptions);
			const failingPromise = Promise.reject(httpError);

			try {
				await withAuthRedirect(failingPromise);

				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(HTTPError);
				expect(mockRedirect).toHaveBeenCalledWith(routes.onboarding());
			}
		});

		it("should rethrow non-401 HTTP errors without redirecting when consent is given", async () => {
			const mockConsentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(mockConsentData) });

			const mockRequest = { method: "GET", url: "https://api.test.com/users" };
			const response = new Response("Server Error", { status: 500 });
			const httpError = new HTTPError(response, mockRequest as any, {} as NormalizedOptions);
			const failingPromise = Promise.reject(httpError);

			try {
				await withAuthRedirect(failingPromise);

				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(HTTPError);
				expect(mockRedirect).not.toHaveBeenCalled();
			}
		});

		it("should rethrow non-HTTP errors without redirecting when consent is given", async () => {
			const mockConsentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(mockConsentData) });

			const genericError = new Error("Network error");
			const failingPromise = Promise.reject(genericError);

			try {
				await withAuthRedirect(failingPromise);

				expect(true).toBe(false);
			} catch (error) {
				expect(error).toHaveProperty("message", "Network error");
				expect(mockRedirect).not.toHaveBeenCalled();
			}
		});

		it("should handle different HTTP status codes correctly when consent is given", async () => {
			const testCases = [
				{ shouldRedirect: false, status: 400 },
				{ shouldRedirect: true, status: 401 },
				{ shouldRedirect: false, status: 403 },
				{ shouldRedirect: false, status: 404 },
				{ shouldRedirect: false, status: 500 },
			];

			for (const { shouldRedirect, status } of testCases) {
				vi.clearAllMocks();

				const mockConsentData: CookieConsentData = {
					consentGiven: true,
					hasInteracted: true,
					preferences: { analytics: true, essential: true },
				};
				mockCookieStore.get.mockReturnValue({ value: JSON.stringify(mockConsentData) });
				mockCookies.mockResolvedValue(mockCookieStore);

				const mockRequest = { method: "GET", url: "https://api.test.com/test" };
				const response = new Response("Error", { status });
				const httpError = new HTTPError(response, mockRequest as any, {} as NormalizedOptions);
				const failingPromise = Promise.reject(httpError);

				try {
					await withAuthRedirect(failingPromise);

					expect(true).toBe(false);
				} catch (error) {
					expect(error).toBeInstanceOf(HTTPError);

					if (shouldRedirect) {
						expect(mockRedirect).toHaveBeenCalledWith(routes.onboarding());
					} else {
						expect(mockRedirect).not.toHaveBeenCalled();
					}
				}
			}
		});

		it("should handle string errors when consent is given", async () => {
			const mockConsentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(mockConsentData) });

			const failingPromise = Promise.reject(new Error("String error"));

			await expect(withAuthRedirect(failingPromise)).rejects.toThrow("String error");
			expect(mockRedirect).not.toHaveBeenCalled();
		});

		it("should handle null/undefined errors when consent is given", async () => {
			const mockConsentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockCookieStore.get.mockReturnValue({ value: JSON.stringify(mockConsentData) });

			const nullPromise = Promise.reject(new Error("null"));
			const undefinedPromise = Promise.reject(new Error("undefined"));

			await expect(withAuthRedirect(nullPromise)).rejects.toThrow("null");
			await expect(withAuthRedirect(undefinedPromise)).rejects.toThrow("undefined");
			expect(mockRedirect).not.toHaveBeenCalled();
		});

		it("should handle consent check failure with corrupted cookie data", async () => {
			const successPromise = Promise.resolve({ data: "test" });

			mockCookieStore.get.mockReturnValue({ value: "invalid-json-{" });
			mockRedirect.mockImplementation(() => {
				throw new Error("NEXT_REDIRECT");
			});

			await expect(withAuthRedirect(successPromise)).rejects.toThrow("NEXT_REDIRECT");

			expect(mockRedirect).toHaveBeenCalledWith(routes.onboarding());
		});

		it("should prioritize consent check over HTTP error handling", async () => {
			mockCookieStore.get.mockReturnValue(undefined);
			mockRedirect.mockImplementation(() => {
				throw new Error("NEXT_REDIRECT");
			});

			const successPromise = Promise.resolve({ data: "test" });

			await expect(withAuthRedirect(successPromise)).rejects.toThrow("NEXT_REDIRECT");

			expect(vi.mocked(log.warn)).toHaveBeenCalledWith(
				"No cookie consent found, redirecting to onboarding",
				expect.objectContaining({
					cookie_name: COOKIE_CONSENT,
					redirect_path: routes.onboarding(),
				}),
			);
		});
	});
});
