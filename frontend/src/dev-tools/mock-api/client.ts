import { getEnv } from "@/utils/env";

interface MockAPIConfig {
	delay?: number;
	errorRate?: number;
}

type MockHandler<T = unknown> = (options: {
	body?: unknown;
	params?: Record<string, string>;
	query?: URLSearchParams;
}) => Promise<T>;

class MockAPIClient {
	private config: MockAPIConfig = {
		delay: 300,
		errorRate: 0,
	};
	private handlers = new Map<string, MockHandler>();

	constructor() {
		if (!getEnv().NEXT_PUBLIC_MOCK_API) {
			throw new Error("Mock API client initialized when NEXT_PUBLIC_MOCK_API is false");
		}
	}

	async intercept<T>(path: string, options?: { body?: string; method?: string }): Promise<T> {
		const handler = this.findHandler(path);
		if (!handler) {
			throw new Error(`No mock handler registered for path: ${path}`);
		}

		await this.simulateDelay();

		if (this.shouldSimulateError()) {
			throw new Error("Simulated network error");
		}

		let body: unknown;
		if (options?.body) {
			try {
				body = JSON.parse(options.body) as unknown;
			} catch {
				body = options.body;
			}
		}

		const url = new URL(path, "http://mock");
		const params = this.extractPathParams(path);

		const response = await handler({
			body,
			params,
			query: url.searchParams,
		});

		return response as T;
	}

	register(path: string, handler: MockHandler): void {
		this.handlers.set(path, handler);
	}

	setDelay(ms: number): void {
		this.config.delay = ms;
	}

	setErrorRate(rate: number): void {
		this.config.errorRate = Math.max(0, Math.min(100, rate));
	}

	private extractPathParams(path: string): Record<string, string> {
		const pathParts = path.split("/").filter(Boolean);
		const params: Record<string, string> = {};

		for (const [pattern] of this.handlers) {
			const patternParts = pattern.split("/").filter(Boolean);
			if (patternParts.length === pathParts.length) {
				let matches = true;
				patternParts.forEach((part, index) => {
					if (part.startsWith(":")) {
						params[part.slice(1)] = pathParts[index];
					} else if (part !== pathParts[index]) {
						matches = false;
					}
				});
				if (matches) {
					break;
				}
			}
		}

		return params;
	}

	private findHandler(path: string): MockHandler | undefined {
		for (const [pattern, handler] of this.handlers) {
			if (this.matchPath(pattern, path)) {
				return handler;
			}
		}
		return undefined;
	}

	private matchPath(pattern: string, path: string): boolean {
		const patternParts = pattern.split("/").filter(Boolean);
		const pathParts = path.split("/").filter(Boolean);

		if (patternParts.length !== pathParts.length) {
			return false;
		}

		return patternParts.every((part, index) => {
			if (part.startsWith(":")) {
				return true;
			}
			return part === pathParts[index];
		});
	}

	private shouldSimulateError(): boolean {
		return Math.random() * 100 < (this.config.errorRate ?? 0);
	}

	private async simulateDelay(): Promise<void> {
		if (this.config.delay && this.config.delay > 0) {
			await new Promise((resolve) => setTimeout(resolve, this.config.delay));
		}
	}
}

let mockAPIClient: MockAPIClient | null = null;

export function getMockAPIClient(): MockAPIClient {
	if (!mockAPIClient) {
		mockAPIClient = new MockAPIClient();
	}
	return mockAPIClient;
}

export function isMockAPIEnabled(): boolean {
	return getEnv().NEXT_PUBLIC_MOCK_API ?? false;
}
