import { HTTPError } from "ky";

export interface RetryOptions {
	backoffMultiplier?: number;
	initialDelay?: number;
	maxDelay?: number;
	maxRetries?: number;
	retryCondition?: (error: unknown) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
	backoffMultiplier: 2,
	initialDelay: 1000,
	maxDelay: 10_000,
	maxRetries: 3,
	retryCondition: (error: unknown) => {
		if (error instanceof HTTPError) {
			const { status } = error.response;
			// Retry on 500, 502, 503, 504 errors (server errors)
			// Don't retry on 400-level errors (client errors) except 408 (timeout)
			return status >= 500 || status === 408;
		}
		// Retry on network errors
		return true;
	},
};

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
	let lastError: unknown;

	for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error: unknown) {
			lastError = error;

			// Don't retry if this is the last attempt
			if (attempt === config.maxRetries) {
				break;
			}

			// Check if we should retry this error
			if (!config.retryCondition(error)) {
				break;
			}

			// Calculate delay with exponential backoff
			const delay = Math.min(config.initialDelay * config.backoffMultiplier ** attempt, config.maxDelay);

			// Add jitter to prevent thundering herd

			const jitteredDelay = delay + Math.random() * 0.1 * delay;

			await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
		}
	}

	throw lastError;
}
