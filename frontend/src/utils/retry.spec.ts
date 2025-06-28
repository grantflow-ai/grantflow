import { HTTPError } from "ky";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { withRetry } from "./retry";


const createMockHTTPError = (status: number, message = `HTTP ${status}`) => ({
	constructor: HTTPError,
	message,
	name: "HTTPError",
	response: { status },
});

describe("withRetry", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should succeed on first attempt", async () => {
		const mockFn = vi.fn().mockResolvedValue("success");

		const result = await withRetry(mockFn);

		expect(result).toBe("success");
		expect(mockFn).toHaveBeenCalledTimes(1);
	});

	it("should retry on server errors with exponential backoff", async () => {
		const serverError = new HTTPError(new Response(null, { status: 500 }), {} as any, {} as any);
		const mockFn = vi
			.fn()
			.mockRejectedValueOnce(serverError)
			.mockRejectedValueOnce(serverError)
			.mockResolvedValue("success");

		const resultPromise = withRetry(mockFn, { initialDelay: 1000, maxRetries: 3 });

		
		await vi.advanceTimersByTimeAsync(0);
		expect(mockFn).toHaveBeenCalledTimes(1);

		
		await vi.advanceTimersByTimeAsync(1100);
		expect(mockFn).toHaveBeenCalledTimes(2);

		
		await vi.advanceTimersByTimeAsync(2200);
		expect(mockFn).toHaveBeenCalledTimes(3);

		const result = await resultPromise;
		expect(result).toBe("success");
	});

	it("should not retry on client errors", async () => {
		const clientError = new HTTPError(new Response(null, { status: 400 }), {} as any, {} as any);
		const mockFn = vi.fn().mockRejectedValue(clientError);

		await expect(withRetry(mockFn)).rejects.toThrow(HTTPError);
		expect(mockFn).toHaveBeenCalledTimes(1);
	});

	it("should retry on 408 timeout errors", async () => {
		const timeoutError = new HTTPError(new Response(null, { status: 408 }), {} as any, {} as any);
		const mockFn = vi.fn().mockRejectedValueOnce(timeoutError).mockResolvedValue("success");

		const resultPromise = withRetry(mockFn, { initialDelay: 500, maxRetries: 1 });

		await vi.advanceTimersByTimeAsync(0);
		expect(mockFn).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(600);
		expect(mockFn).toHaveBeenCalledTimes(2);

		const result = await resultPromise;
		expect(result).toBe("success");
	});

	it("should respect maxRetries limit", async () => {
		const serverError = createMockHTTPError(500);
		const mockFn = vi.fn().mockRejectedValue(serverError);

		
		const resultPromise = withRetry(mockFn, { initialDelay: 100, maxRetries: 2 }).catch((error: unknown) => error);

		
		await vi.advanceTimersByTimeAsync(0);
		expect(mockFn).toHaveBeenCalledTimes(1);

		
		await vi.advanceTimersByTimeAsync(200);
		expect(mockFn).toHaveBeenCalledTimes(2);

		
		await vi.advanceTimersByTimeAsync(400);
		expect(mockFn).toHaveBeenCalledTimes(3);

		
		const finalError = await resultPromise;
		expect(finalError).toBe(serverError);
		expect(mockFn).toHaveBeenCalledTimes(3);
	});

	it("should respect custom retry condition", async () => {
		const customError = new Error("Custom error");
		const mockFn = vi.fn().mockRejectedValue(customError);

		const retryCondition = vi.fn().mockReturnValue(false);

		await expect(
			withRetry(mockFn, {
				maxRetries: 3,
				retryCondition,
			}),
		).rejects.toThrow("Custom error");

		expect(mockFn).toHaveBeenCalledTimes(1);
		expect(retryCondition).toHaveBeenCalledWith(customError);
	});

	it("should cap delay at maxDelay", async () => {
		const serverError = createMockHTTPError(500);
		const mockFn = vi.fn().mockRejectedValue(serverError);

		
		const resultPromise = withRetry(mockFn, {
			backoffMultiplier: 3,
			initialDelay: 1000,
			maxDelay: 1500,
			maxRetries: 2,
		}).catch((error: unknown) => error);

		await vi.advanceTimersByTimeAsync(0);
		expect(mockFn).toHaveBeenCalledTimes(1);

		
		await vi.advanceTimersByTimeAsync(1200);
		expect(mockFn).toHaveBeenCalledTimes(2);

		
		await vi.advanceTimersByTimeAsync(1700);
		expect(mockFn).toHaveBeenCalledTimes(3);

		
		const finalError = await resultPromise;
		expect(finalError).toBe(serverError);
	});
});
