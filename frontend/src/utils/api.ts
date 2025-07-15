import ky, { type KyInstance } from "ky";
import { createMockResponse } from "@/dev-tools/mock-api/mock-response";
import { shouldSkipLogging } from "@/dev-tools/utils/dev-helpers";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";
import { Ref } from "@/utils/state";

const clientRef = new Ref<KyInstance>();

const ONE_MINUTE_IN_MS = 60 * 1000;

export function getClient(): KyInstance {
	const backendUrl = getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL;

	// Log the API base URL on initialization
	if (!clientRef.value) {
		log.info("Initializing API client", {
			backend_url: backendUrl,
			environment: process.env.NODE_ENV,
		});
	}

	clientRef.value ??= ky.create({
		hooks: {
			afterResponse: [
				async (request, _options, response) => {
					if (shouldSkipLogging()) {
						return response;
					}

					// Clone response to read body for debugging
					const clonedResponse = response.clone();
					let responseBody: unknown;

					try {
						const contentType = response.headers.get("content-type");
						if (contentType?.includes("application/json")) {
							responseBody = await clonedResponse.json();
						}
					} catch {
						// Ignore parsing errors
					}

					log.info(`API ${request.method} ${request.url} - ${response.status}`, {
						method: request.method,
						operation: request.headers.get("X-Operation"),
						response_body: responseBody,
						response_headers: Object.fromEntries(response.headers.entries()),
						status: response.status,
						trace_id: request.headers.get("X-Trace-ID"),
						url: request.url,
					});

					return response;
				},
			],
			beforeError: [
				async (error) => {
					if (shouldSkipLogging()) {
						return error;
					}

					let responseBody: unknown;
					let responseText: string | undefined;

					try {
						// Clone and try to read the error response body
						const clonedResponse = error.response.clone();
						const contentType = error.response.headers.get("content-type");

						if (contentType?.includes("application/json")) {
							responseBody = await clonedResponse.json();
						} else {
							responseText = await clonedResponse.text();
						}
					} catch {
						// Ignore parsing errors
					}

					log.error(`API ERROR ${error.request.method} ${error.request.url}`, error, {
						backend_url: backendUrl,
						error_message: error.message,
						method: error.request.method,
						operation: error.request.headers.get("X-Operation"),
						request_headers: Object.fromEntries(error.request.headers.entries()),
						response_body: responseBody,
						response_headers: Object.fromEntries(error.response.headers.entries()),
						response_text: responseText,
						status: error.response.status,
						status_text: error.response.statusText,
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

					// Log the full request details
					if (!shouldSkipLogging()) {
						let requestBody: unknown;

						// Extract request body if available
						if (options.body) {
							try {
								requestBody =
									typeof options.body === "string" ? JSON.parse(options.body) : options.body;
							} catch {
								requestBody = options.body;
							}
						}

						log.info(`API REQUEST ${request.method} ${request.url}`, {
							base_url: backendUrl,
							full_url: new URL(request.url).href,
							method: request.method,
							operation: request.headers.get("X-Operation"),
							pathname: new URL(request.url).pathname,
							request_body: requestBody,
							request_headers: Object.fromEntries(request.headers.entries()),
							trace_id: request.headers.get("X-Trace-ID"),
							url: request.url,
						});
					}
				},
			],
		},
		prefixUrl: backendUrl,
		timeout: ONE_MINUTE_IN_MS * 10,
	});

	return clientRef.value;
}
