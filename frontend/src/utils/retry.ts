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
			
			
			return status >= 500 || status === 408;
		}
		
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

			
			if (attempt === config.maxRetries) {
				break;
			}

			
			if (!config.retryCondition(error)) {
				break;
			}

			
			const delay = Math.min(config.initialDelay * config.backoffMultiplier ** attempt, config.maxDelay);

			

			const jitteredDelay = delay + Math.random() * 0.1 * delay;

			await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
		}
	}

	throw lastError;
}
