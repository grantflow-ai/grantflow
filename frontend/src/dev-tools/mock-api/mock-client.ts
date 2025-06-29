import type { KyInstance } from "ky";
import { getClient } from "@/utils/api";
import { getEnv } from "@/utils/env";
import { getMockAPIClient, isMockAPIEnabled } from "./client";
import { registerMockHandlers } from "./register";

let mockHandlersRegistered = false;

interface MockResponse {
	arrayBuffer: () => Promise<ArrayBuffer>;
	blob: () => Promise<Blob>;
	formData: () => Promise<FormData>;
	json: <T = unknown>() => Promise<T>;
	text: () => Promise<string>;
}

interface RequestOptions {
	body?: string;
	headers?: Record<string, string>;
	json?: unknown;
	method?: string;
}

class MockKyWrapper {
	private mockClient = getMockAPIClient();
	private realClient: KyInstance;

	constructor() {
		this.realClient = getClient();
		if (!mockHandlersRegistered) {
			registerMockHandlers();
			mockHandlersRegistered = true;
			console.log("[Mock API] Mock handlers registered");
		}
	}

	create(_options?: unknown): this {
		return this;
	}

	delete(url: string | URL, options?: RequestOptions): Promise<void> {
		return this.request(url.toString(), { ...options, method: "DELETE" }).then(() => undefined);
	}

	extend(_options?: unknown): this {
		return this;
	}

	get(url: string | URL, options?: RequestOptions): Promise<MockResponse> {
		return this.request(url.toString(), { ...options, method: "GET" });
	}

	head(url: string | URL, options?: RequestOptions): Promise<MockResponse> {
		// For HEAD requests, use the real client as they don't typically need mocking
		return this.realClient.head(url, options) as Promise<MockResponse>;
	}

	patch(url: string | URL, options?: RequestOptions): Promise<MockResponse> {
		return this.request(url.toString(), { ...options, method: "PATCH" });
	}

	post(url: string | URL, options?: RequestOptions): Promise<MockResponse> {
		return this.request(url.toString(), { ...options, method: "POST" });
	}

	put(url: string | URL, options?: RequestOptions): Promise<MockResponse> {
		return this.request(url.toString(), { ...options, method: "PUT" });
	}

	async request(url: string, options?: RequestOptions): Promise<MockResponse> {
		const path = this.extractPath(url);
		console.log(`[Mock API] Intercepting request: ${options?.method ?? "GET"} ${path}`);

		const result = await this.mockClient.intercept<unknown>(path, {
			body: options?.json ? JSON.stringify(options.json) : options?.body,
			method: options?.method ?? "GET",
		});

		return createMockResponse(result);
	}

	// Add the missing stop method
	stop(): void {
		// No-op for mock client
	}

	private extractPath(url: string): string {
		// Remove the base URL if present
		const baseUrl = getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL;
		if (url.startsWith(baseUrl)) {
			return url.slice(baseUrl.length);
		}
		// Handle relative URLs
		if (url.startsWith("/")) {
			return url;
		}
		// Prepend slash if missing
		return `/${url}`;
	}
}

// Simple mock response that provides the minimal interface we need
function createMockResponse(data: unknown): MockResponse {
	const jsonData = JSON.stringify(data);
	return {
		async arrayBuffer(): Promise<ArrayBuffer> {
			return new TextEncoder().encode(jsonData).buffer as ArrayBuffer;
		},
		async blob(): Promise<Blob> {
			return new Blob([jsonData]);
		},
		async formData(): Promise<FormData> {
			return new FormData();
		},
		async json<T = unknown>(): Promise<T> {
			return data as T;
		},
		async text(): Promise<string> {
			return jsonData;
		},
	};
}

let mockClientInstance: MockKyWrapper | null = null;

export function getMockClient(): KyInstance | MockKyWrapper {
	if (!isMockAPIEnabled()) {
		return getClient();
	}

	if (!mockClientInstance) {
		mockClientInstance = new MockKyWrapper();
	}

	return mockClientInstance;
}
