import type { HTTPError } from "ky";
import { describe, expect, it, vi } from "vitest";
import { extractGrantTemplateValidationError, isValidUrl } from "./validation";

const createMockHTTPError = (status: number, responseData: unknown): HTTPError => {
	const response = {
		json: vi.fn().mockResolvedValue(responseData),
		status,
	};

	return {
		response,
	} as unknown as HTTPError;
};

describe("validation utils", () => {
	describe("isValidUrl", () => {
		it("should return true for valid URLs", () => {
			const validUrls = [
				"https://example.com",
				"http://example.com",
				"https://subdomain.example.com",
				"https://example.com/path",
				"https://example.com/path?query=value",
				"https://example.com:8080",
				"https://example.com/path#fragment",
				"https://user:pass@example.com",
				"https://192.168.1.1",
				"https://[2001:db8::1]",
			];

			for (const url of validUrls) {
				expect(isValidUrl(url)).toBe(true);
			}
		});

		it("should return false for invalid URLs", () => {
			const invalidUrls = [
				"",
				"example.com",
				"//example.com",
				"http://",
				"https://",
				"not a url",
				"http://example.com:999999",
			];

			for (const url of invalidUrls) {
				expect(isValidUrl(url)).toBe(false);
			}
		});

		it("should return true for URLs that zod considers valid even if they seem unusual", () => {
			const unusualButValidUrls = ["http://example", "http://example.", "http://.com", "http://example..com"];

			for (const url of unusualButValidUrls) {
				expect(isValidUrl(url)).toBe(true);
			}
		});

		it("should handle edge cases", () => {
			expect(isValidUrl("https://example.com/path with spaces")).toBe(true);
			expect(isValidUrl("https://example.com/path%20with%20spaces")).toBe(true);
			expect(isValidUrl("https://xn--e1afmkfd.xn--p1ai")).toBe(true);
			expect(isValidUrl("https://example.com/~user")).toBe(true);
			expect(isValidUrl("https://example.com/@user")).toBe(true);
			// eslint-disable-next-line sonarjs/code-eval
			expect(isValidUrl("javascript:alert('xss')")).toBe(true);
			expect(isValidUrl("ftp://example.com")).toBe(true);
		});
	});

	describe("extractGrantTemplateValidationError", () => {
		it("should return the error detail for 422 status with known template not found error", async () => {
			const errorDetail = "Grant template not found";
			const httpError = createMockHTTPError(422, { detail: errorDetail });

			const result = await extractGrantTemplateValidationError(httpError);
			expect(result).toBe(errorDetail);
		});

		it("should return the error detail for 422 status with known no rag sources error", async () => {
			const errorDetail = "No rag sources found for grant template, cannot generate";
			const httpError = createMockHTTPError(422, { detail: errorDetail });

			const result = await extractGrantTemplateValidationError(httpError);
			expect(result).toBe(errorDetail);
		});

		it("should return the error detail for 422 status with partial known error messages", async () => {
			const errorDetail = "Error: Grant template not found in database";
			const httpError = createMockHTTPError(422, { detail: errorDetail });

			const result = await extractGrantTemplateValidationError(httpError);
			expect(result).toBe(errorDetail);
		});

		it("should return false for non-422 status codes", async () => {
			const statusCodes = [400, 401, 403, 404, 500, 502, 503];

			for (const status of statusCodes) {
				const httpError = createMockHTTPError(status, { detail: "Some error" });
				const result = await extractGrantTemplateValidationError(httpError);
				expect(result).toBe(false);
			}
		});

		it("should return false for 422 status with unknown error message", async () => {
			const errorDetail = "Some other validation error";
			const httpError = createMockHTTPError(422, { detail: errorDetail });

			const result = await extractGrantTemplateValidationError(httpError);
			expect(result).toBe(false);
		});

		it("should return false for malformed response without detail property", async () => {
			const responses = [
				{},
				{ error: "Something went wrong" },
				{ message: "Error occurred" },
				null,
				undefined,
				"string response",
				123,
				[],
			];

			for (const responseData of responses) {
				const httpError = createMockHTTPError(422, responseData);
				const result = await extractGrantTemplateValidationError(httpError);
				expect(result).toBe(false);
			}
		});

		it("should return false when detail is not a string", async () => {
			const responses = [
				{ detail: null },
				{ detail: undefined },
				{ detail: 123 },
				{ detail: true },
				{ detail: {} },
				{ detail: [] },
				{ detail: { message: "error" } },
			];

			for (const responseData of responses) {
				const httpError = createMockHTTPError(422, responseData);
				const result = await extractGrantTemplateValidationError(httpError);
				expect(result).toBe(false);
			}
		});

		it("should handle JSON parsing errors gracefully", async () => {
			const response = {
				json: vi.fn().mockRejectedValue(new Error("JSON parsing failed")),
				status: 422,
			};

			const httpError = {
				response,
			} as unknown as HTTPError;

			const result = await extractGrantTemplateValidationError(httpError);
			expect(result).toBe(false);
		});

		it("should handle response.json() throwing non-Error objects", async () => {
			const response = {
				json: vi.fn().mockRejectedValue("String error"),
				status: 422,
			};

			const httpError = {
				response,
			} as unknown as HTTPError;

			const result = await extractGrantTemplateValidationError(httpError);
			expect(result).toBe(false);
		});
	});
});
