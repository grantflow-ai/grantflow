import type { ErrorType } from "@/constants";
import { NextResponse } from "next/server";

/**
 * Redirects the user to the auth page with an error message.
 * @param requestUrl - The URL of the incoming request.
 * @param errorType - The error type.
 * @param error - The error object.
 * @returns A NextResponse object.
 */
export function errorRedirect({ url, errorType, error }: { url: URL; errorType: ErrorType; error: Error }) {
	// eslint-disable-next-line no-console
	console.error(`An error occurred:\n${error}`);
	url.searchParams.set("error", errorType);
	return NextResponse.redirect(url);
}
