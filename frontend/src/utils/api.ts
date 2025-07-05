import ky, { type KyInstance, type NormalizedOptions } from "ky";

import { createMockResponse } from "@/dev-tools/mock-api/mock-response";
import { getMockAPIClient, isMockAPIEnabled } from "@/dev-tools/mock-api/client";
import { initializeMockAPI } from "@/dev-tools/mock-api/init";
import { shouldSkipLogging } from "@/dev-tools/utils/dev-helpers";
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
					if (shouldSkipLogging()) {
						return response;
					}

					log.info(`API ${request.method} ${request.url} - ${response.status}`, {
						method: request.method,
						operation: request.headers.get("X-Operation"),
						status: response.status,
						trace_id: request.headers.get("X-Trace-ID"),
						url: request.url,
					});

					return response;
				},
			],
			beforeError: [
				(error) => {
					if (shouldSkipLogging()) {
						return error;
					}

					log.error(`API ERROR ${error.request.method} ${error.request.url}`, undefined, {
						error: error.message,
						method: error.request.method,
						operation: error.request.headers.get("X-Operation"),
						status: error.response.status,
						trace_id: error.request.headers.get("X-Trace-ID"),
						url: error.request.url,
					});

					return error;
				},
			],
			beforeRequest: [
				async (request, options) => {
					const mockResponse = await createMockResponse(request, options);
					if (mockResponse) {
						return mockResponse;
					}

					log.info(`API ${request.method} ${request.url}`, {
						method: request.method,
						operation: request.headers.get("X-Operation"),
						trace_id: request.headers.get("X-Trace-ID"),
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

function createMockErrorResponse(error: unknown): Response {
	return new Response(
		JSON.stringify({
			detail: "Mock API failed to handle request",
			error: error instanceof Error ? error.message : "Mock API error",
		}),
		{
			headers: {
				"Content-Type": "application/json",
			},
			status: 500,
		},
	);
}

async function createMockResponse(request: Request, _options: NormalizedOptions): Promise<Response | undefined> {
	if (!shouldUseMockAPI()) {
		return undefined;
	}

	ensureMockAPIInitialized();

	try {
		const baseUrl = getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL;
		const path = extractRequestPath(request.url, baseUrl);

		log.info(`[Mock API] Intercepting ${request.method} ${path}`, {
			baseUrlPath: new URL(baseUrl).pathname,
			extractedPath: path,
			fullUrl: request.url,
			isGrantTemplateCall: path.includes("grant-template"),
		});

		const body = await parseRequestBody(request);

		const result = await getMockAPIClient().intercept<unknown>(path, {
			body: body ? JSON.stringify(body) : undefined,
			method: request.method,
		});

		return new Response(JSON.stringify(result), {
			headers: {
				"Content-Type": "application/json",
			},
			status: 200,
		});
	} catch (error) {
		log.error("[Mock API] Error handling request", error);
		return createMockErrorResponse(error);
	}
}

function ensureMockAPIInitialized(): void {
	if (!mockHandlersRegistered) {
		initializeMockAPI();
		mockHandlersRegistered = true;
		log.info("[Mock API] Mock API initialized");
	}
}

function extractRequestPath(requestUrl: string, baseUrl: string): string {
	const url = new URL(requestUrl);
	const baseUrlObj = new URL(baseUrl);

	let path = url.pathname;
	if (path.startsWith(baseUrlObj.pathname)) {
		path = path.slice(baseUrlObj.pathname.length);
	}

	if (!path.startsWith("/")) {
		path = `/${path}`;
	}

	if (url.search) {
		path += url.search;
	}

	return path;
}

async function parseRequestBody(request: Request): Promise<unknown> {
	if (!request.body) {
		return undefined;
	}

	const clonedRequest = request.clone();
	const contentType = request.headers.get("content-type");

	if (contentType?.includes("application/json")) {
		return (await clonedRequest.json()) as unknown;
	}

	if (contentType?.includes("multipart/form-data")) {
		return (await clonedRequest.formData()) as unknown;
	}

	return (await clonedRequest.text()) as unknown;
}

function shouldUseMockAPI(): boolean {
	return Boolean(getEnv().NEXT_PUBLIC_MOCK_API) && isMockAPIEnabled();
}
