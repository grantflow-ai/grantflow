import ky, { type KyInstance } from "ky";

import { getEnv } from "@/utils/env";
import { logTrace } from "@/utils/logging";
import { Ref } from "@/utils/state";

const clientRef = new Ref<KyInstance>();

const ONE_MINUTE_IN_MS = 60 * 1000;

export function getClient(): KyInstance {
	clientRef.value ??= ky.create({
		hooks: {
			afterResponse: [
				(request, _options, response) => {
					// Log the response
					logTrace("info", `API ${request.method} ${request.url} - ${response.status}`, {
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
					// Log API errors
					logTrace("error", `API ERROR ${error.request.method} ${error.request.url}`, {
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
				(request) => {
					// Log the request
					logTrace("info", `API ${request.method} ${request.url}`, {
						// Headers will include any correlation IDs added by the action layer
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