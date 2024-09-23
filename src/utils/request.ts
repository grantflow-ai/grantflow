import type { ErrorType } from "@/constants";
import { serverLogger } from "@/utils/logging/server";
import { NextResponse } from "next/server";

/**
 * Redirects the user to the auth page with an error message.
 * @param requestUrl - The URL of the incoming request.
 * @param errorType - The error type.
 * @param error - The error object.
 * @returns A NextResponse object.
 */
export function errorRedirect({
	url,
	errorType,
	error,
}: {
	url: URL;
	errorType: ErrorType;
	error: Error;
}) {
	serverLogger.error(`${errorType}: ${error.message}`);
	url.searchParams.set("error", errorType);
	return NextResponse.redirect(url);
}
