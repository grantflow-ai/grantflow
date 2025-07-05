import ky, { type KyInstance } from "ky";
import { createMockResponse } from "@/dev-tools/mock-api/mock-response";
import { shouldSkipLogging } from "@/dev-tools/utils/dev-helpers";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";
import { Ref } from "@/utils/state";

const clientRef = new Ref<KyInstance>();

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
