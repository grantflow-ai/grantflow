import type { KyInstance } from "ky";
import { getClient } from "@/utils/api";
import { getEnv } from "@/utils/env";
import { getMockAPIClient, isMockAPIEnabled } from "./client";
import { registerMockHandlers } from "./register";

let mockHandlersRegistered = false;

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

	create(_options?: any): any {
		return this;
	}

	delete(url: string, options?: any): any {
		return this.request(url, { ...options, method: "DELETE" }).then(() => undefined);
	}

	extend(_options?: any): any {
		return this;
	}

	get(url: string, options?: any): any {
		return this.request(url, { ...options, method: "GET" });
	}

	head(url: string, options?: any): any {
		return this.realClient.head(url, options);
	}

	patch(url: string, options?: any): any {
		return this.request(url, { ...options, method: "PATCH" });
	}

	post(url: string, options?: any): any {
		return this.request(url, { ...options, method: "POST" });
	}

	put(url: string, options?: any): any {
		return this.request(url, { ...options, method: "PUT" });
	}

	async request(url: string, options?: any): Promise<any> {
		const path = this.extractPath(url);
		console.log(`[Mock API] Intercepting request: ${options?.method || "GET"} ${path}`);

		const result = await this.mockClient.intercept(path, {
			body: options?.json ? JSON.stringify(options.json) : options?.body,
			method: options?.method || "GET",
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
function createMockResponse(data: unknown): any {
	return {
		arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(data)).buffer,
		blob: async () => new Blob([JSON.stringify(data)]),
		formData: async () => new FormData(),
		json: async () => data,
		text: async () => JSON.stringify(data),
	};
}

let mockClientInstance: MockKyWrapper | null = null;

export function getMockClient(): any {
	if (!isMockAPIEnabled()) {
		return getClient();
	}

	if (!mockClientInstance) {
		mockClientInstance = new MockKyWrapper();
	}

	return mockClientInstance;
}