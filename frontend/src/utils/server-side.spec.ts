import { HTTPError, type NormalizedOptions } from "ky";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/constants";
import { PagePath } from "@/enums";
import { log } from "@/utils/logger";
import { createAuthHeaders, redirectWithToastParams, withAuthRedirect, withErrorToast } from "./server-side";

vi.mock("next/headers", () => ({
	cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("@/constants", () => ({
	SESSION_COOKIE: "test-session-cookie",
}));

vi.mock("@/enums", () => ({
	PagePath: {
		DASHBOARD: "/dashboard",
		ONBOARDING: "/onboarding",
	},
}));

describe("Server-side Utils", () => {
	const mockCookieStore = {
		get: vi.fn(),
	};
	const mockRedirect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(cookies).mockResolvedValue(mockCookieStore as never);
		vi.mocked(redirect).mockImplementation(mockRedirect as never);
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
				path: PagePath.DASHBOARD,
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
					path: PagePath.DASHBOARD,
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

			await createAuthHeaders();

			expect(mockCookieStore.get).toHaveBeenCalledWith(SESSION_COOKIE);
			expect(mockRedirect).toHaveBeenCalledWith(PagePath.ONBOARDING);
		});

		it("should redirect to onboarding when session cookie has no value", async () => {
			mockCookieStore.get.mockReturnValue({ value: "" });

			await createAuthHeaders();

			expect(mockRedirect).toHaveBeenCalledWith(PagePath.ONBOARDING);
		});

		it("should redirect to onboarding when session cookie has null value", async () => {
			mockCookieStore.get.mockReturnValue({ value: null });

			await createAuthHeaders();

			expect(mockRedirect).toHaveBeenCalledWith(PagePath.ONBOARDING);
		});
	});

	describe("withAuthRedirect", () => {
		it("should return the value when promise resolves successfully", async () => {
			const expectedValue = { data: "test" };
			const successPromise = Promise.resolve(expectedValue);

			const result = await withAuthRedirect(successPromise);

			expect(result).toEqual(expectedValue);
			expect(mockRedirect).not.toHaveBeenCalled();
		});

		it("should redirect to onboarding on 401 HTTP errors", async () => {
			const mockRequest = { method: "GET", url: "https://api.test.com/users" };
			const response = new Response("Unauthorized", { status: 401 });
			const httpError = new HTTPError(response, mockRequest as any, {} as NormalizedOptions);
			const failingPromise = Promise.reject(httpError);

			try {
				await withAuthRedirect(failingPromise);

				expect(true).toBe(false);
			} catch {
				expect(mockRedirect).toHaveBeenCalledWith(PagePath.ONBOARDING);
			}
		});

		it("should rethrow 401 HTTP errors after redirecting", async () => {
			const mockRequest = { method: "GET", url: "https://api.test.com/users" };
			const response = new Response("Unauthorized", { status: 401 });
			const httpError = new HTTPError(response, mockRequest as any, {} as NormalizedOptions);
			const failingPromise = Promise.reject(httpError);

			try {
				await withAuthRedirect(failingPromise);

				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(HTTPError);
				expect(mockRedirect).toHaveBeenCalledWith(PagePath.ONBOARDING);
			}
		});

		it("should rethrow non-401 HTTP errors without redirecting", async () => {
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

		it("should rethrow non-HTTP errors without redirecting", async () => {
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

		it("should handle different HTTP status codes correctly", async () => {
			const testCases = [
				{ shouldRedirect: false, status: 400 },
				{ shouldRedirect: true, status: 401 },
				{ shouldRedirect: false, status: 403 },
				{ shouldRedirect: false, status: 404 },
				{ shouldRedirect: false, status: 500 },
			];

			for (const { shouldRedirect, status } of testCases) {
				vi.clearAllMocks();

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
						expect(mockRedirect).toHaveBeenCalledWith(PagePath.ONBOARDING);
					} else {
						expect(mockRedirect).not.toHaveBeenCalled();
					}
				}
			}
		});

		it("should handle string errors", async () => {
			const failingPromise = Promise.reject(new Error("String error"));

			await expect(withAuthRedirect(failingPromise)).rejects.toThrow("String error");
			expect(mockRedirect).not.toHaveBeenCalled();
		});

		it("should handle null/undefined errors", async () => {
			const nullPromise = Promise.reject(new Error("null"));
			const undefinedPromise = Promise.reject(new Error("undefined"));

			await expect(withAuthRedirect(nullPromise)).rejects.toThrow("null");
			await expect(withAuthRedirect(undefinedPromise)).rejects.toThrow("undefined");
			expect(mockRedirect).not.toHaveBeenCalled();
		});
	});
});