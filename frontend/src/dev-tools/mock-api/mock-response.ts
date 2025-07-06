import type { NormalizedOptions } from "ky";
import { getMockAPIClient, isMockAPIEnabled } from "@/dev-tools";
import { initializeMockAPI } from "@/dev-tools/mock-api/init";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";

export async function createMockResponse(request: Request, _options: NormalizedOptions): Promise<Response | undefined> {
	if (!shouldUseMockAPI()) {
		return undefined;
	}

	initializeMockAPI();

	try {
		const url = new URL(request.url);
		const baseUrl = new URL(getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL);
		const path = extractPathFromUrl(url, baseUrl);

		log.info(`[Mock API] Intercepting ${request.method} ${path}`, {
			baseUrlPath: baseUrl.pathname,
			extractedPath: path,
			fullUrl: request.url,
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

function extractPathFromUrl(url: URL, baseUrl: URL): string {
	let path = url.pathname;
	if (path.startsWith(baseUrl.pathname)) {
		path = path.slice(baseUrl.pathname.length);
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

	return (await clonedRequest.text()) as unknown;
}

function shouldUseMockAPI(): boolean {
	return Boolean(getEnv().NEXT_PUBLIC_MOCK_API) && isMockAPIEnabled();
}
