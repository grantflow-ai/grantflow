import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";

interface MockAPIConfig {
	currentScenario?: string;
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
		currentScenario: "minimal",
		delay: 3000,
		errorRate: 0,
	};
	private handlers = new Map<string, MockHandler>();

	constructor() {
		if (!getEnv().NEXT_PUBLIC_MOCK_API) {
			throw new Error("Mock API client initialized when NEXT_PUBLIC_MOCK_API is false");
		}
	}

	getCurrentScenarioName(): string {
		return this.config.currentScenario ?? "minimal";
	}

	async intercept<T>(path: string, options?: { body?: string; method?: string }): Promise<T> {
		const method = options?.method ?? "GET";
		log.info("[MockAPIClient] Intercepting request", {
			hasBody: !!options?.body,
			method,
			path,
		});

		const handler = this.findHandler(path, method);
		if (!handler) {
			log.error(`[MockAPIClient] No mock handler registered for ${method} ${path}`);
			throw new Error(`No mock handler registered for ${method} ${path}`);
		}

		log.info("[MockAPIClient] Handler found, simulating delay", {
			delay: this.config.delay,
			path,
		});

		await this.simulateDelay();

		if (this.shouldSimulateError()) {
			log.warn("[MockAPIClient] Simulating network error", { path });
			throw new Error("Simulated network error");
		}

		let body: unknown;
		if (options?.body) {
			try {
				body = JSON.parse(options.body) as unknown;
				log.info("[MockAPIClient] Parsed request body", {
					bodyKeys: body && typeof body === "object" ? Object.keys(body) : [],
					bodyType: typeof body,
					path,
				});
			} catch {
				body = options.body;
				log.warn("[MockAPIClient] Failed to parse body as JSON", { path });
			}
		}

		const url = new URL(path, "http://mock");
		const params = this.extractPathParams(path, method);

		log.info("[MockAPIClient] Calling handler", {
			hasQuery: url.searchParams.toString().length > 0,
			method,
			params,
			path,
		});

		const response = await handler({
			body,
			params,
			query: url.searchParams,
		});

		log.info("[MockAPIClient] Handler returned response", {
			path,
			responseKeys: response && typeof response === "object" ? Object.keys(response) : [],
			responseType: typeof response,
		});

		return response as T;
	}

	register(path: string, handler: MockHandler, method = "*"): void {
		const key = `${method} ${path}`;
		log.info("[MockAPIClient] Registering handler", { key, method, path });
		this.handlers.set(key, handler);
	}

	setDelay(ms: number): void {
		this.config.delay = ms;
	}

	setErrorRate(rate: number): void {
		this.config.errorRate = Math.max(0, Math.min(100, rate));
	}

	setScenario(scenarioName: string): void {
		log.info("[MockAPIClient] Setting scenario", { scenarioName });
		this.config.currentScenario = scenarioName;
	}

	private extractPathParams(path: string, method: string): Record<string, string> {
		const pathWithoutQuery = path.split("?")[0];
		const pathParts = pathWithoutQuery.split("/").filter(Boolean);
		const params: Record<string, string> = {};

		const handler = this.findHandler(path, method);
		if (!handler) {
			return params;
		}

		for (const [pattern] of this.handlers) {
			const [, ...patternPathParts] = pattern.split(" ");
			const patternPath = patternPathParts.join(" ");
			const patternParts = patternPath.split("/").filter(Boolean);

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

	private findHandler(path: string, method: string): MockHandler | undefined {
		const pathWithoutQuery = path.split("?")[0];

		const exactKey = `${method} ${pathWithoutQuery}`;
		for (const [pattern, handler] of this.handlers) {
			if (this.matchPath(pattern, exactKey)) {
				return handler;
			}
		}

		const wildcardKey = `* ${pathWithoutQuery}`;
		for (const [pattern, handler] of this.handlers) {
			if (this.matchPath(pattern, wildcardKey)) {
				return handler;
			}
		}

		return undefined;
	}

	private matchPath(pattern: string, key: string): boolean {
		const [patternMethod, ...patternPathParts] = pattern.split(" ");
		const [keyMethod, ...keyPathParts] = key.split(" ");

		if (patternMethod !== "*" && patternMethod !== keyMethod) {
			return false;
		}

		const patternPath = patternPathParts.join(" ");
		const keyPath = keyPathParts.join(" ");

		const patternParts = patternPath.split("/").filter(Boolean);
		const pathParts = keyPath.split("/").filter(Boolean);

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
