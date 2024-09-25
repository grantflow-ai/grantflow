import { NextRequest } from "next/server";

/**
 * Create a new `NextRequest` object.
 *
 * @param url - The URL of the request.
 * @param requestInit - The request init options.
 *
 * @returns The new `NextRequest` object.
 */
export function createNextRequest(url: string | URL, requestInit?: RequestInit): NextRequest {
	return new NextRequest(new URL(url), requestInit as any);
}
