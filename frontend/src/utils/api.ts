import ky, { type KyInstance, type NormalizedOptions } from "ky";

import { getMockAPIClient, isMockAPIEnabled } from "@/dev-tools/mock-api/client";
import { initializeMockAPI } from "@/dev-tools/mock-api/init";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";
import { Ref } from "@/utils/state";

const clientRef = new Ref<KyInstance>();
let mockHandlersRegistered = false;

const ONE_MINUTE_IN_MS = 60 * 1000;

export function getClient(): KyInstance {
	clientRef.value ??= ky.create({
		hooks: {
			afterResponse: [
				(request, _options, response) => {
					// Skip logging for mock responses
					if (getEnv().NEXT_PUBLIC_MOCK_API) {
						return response;
					}

					log.info(`API ${request.method} ${request.url} - ${response.status}`, {
						correlation_id: request.headers.get("X-Correlation-ID"),
						method: request.method,
						operation: request.headers.get("X-Operation"),
						status: response.status,
						url: request.url,
					});

					return response;
				},
			],
			beforeError: [
				(error) => {
					// Skip error logging for mock mode
					if (getEnv().NEXT_PUBLIC_MOCK_API) {
						return error;
					}

					log.error(`API ERROR ${error.request.method} ${error.request.url}`, undefined, {
						correlation_id: error.request.headers.get("X-Correlation-ID"),
						error: error.message,
						method: error.request.method,
						operation: error.request.headers.get("X-Operation"),
						status: error.response.status,
						url: error.request.url,
					});

					return error;
				},
			],
			beforeRequest: [
				async (request, options) => {
					// Try to intercept with mock handler first
					const mockResponse = await createMockResponse(request, options);
					if (mockResponse) {
						return mockResponse;
					}

					// Continue with normal request logging
					log.info(`API ${request.method} ${request.url}`, {
						correlation_id: request.headers.get("X-Correlation-ID"),
						method: request.method,
						operation: request.headers.get("X-Operation"),
						url: request.url,
					});
				},
			],
		},
		prefixUrl: getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL,
		timeout: ONE_MINUTE_IN_MS * 10,
	});

	return clientRef.value;
}

async function createMockResponse(request: Request, _options: NormalizedOptions): Promise<Response | undefined> {
	// Check if mock mode is enabled via env
	if (!getEnv().NEXT_PUBLIC_MOCK_API) {
		return undefined;
	}

	// Double check mock is enabled
	if (!isMockAPIEnabled()) {
		return undefined;
	}

	// Register mock handlers once
	if (!mockHandlersRegistered) {
		initializeMockAPI();
		mockHandlersRegistered = true;
		log.info("[Mock API] Mock API initialized");
	}

	try {
		const url = new URL(request.url);
		// Extract path from the URL, removing any leading slash
		const path = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;

		log.info(`[Mock API] Intercepting ${request.method} ${path}`);

		// Get request body if present
		let body: unknown;
		if (request.body) {
			const clonedRequest = request.clone();
			const contentType = request.headers.get("content-type");

			if (contentType?.includes("application/json")) {
				body = (await clonedRequest.json()) as unknown;
			} else if (contentType?.includes("multipart/form-data")) {
				body = (await clonedRequest.formData()) as unknown;
			} else {
				body = (await clonedRequest.text()) as unknown;
			}
		}

		// Call mock handler
		const result = await getMockAPIClient().intercept<unknown>(path, {
			body: body ? JSON.stringify(body) : undefined,
			method: request.method,
		});

		// Create mock response
		return new Response(JSON.stringify(result), {
			headers: {
				"Content-Type": "application/json",
			},
			status: 200,
		});
	} catch (error) {
		log.error("[Mock API] Error handling request", error);
		// Return undefined to let the request proceed normally
		return undefined;
	}
}
