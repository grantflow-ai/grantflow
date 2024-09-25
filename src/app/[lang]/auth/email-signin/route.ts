"use server";

import { PagePath } from "@/config/enums";
import { ErrorType } from "@/constants";
import { errorRedirect } from "@/utils/request";
import { getServerClient } from "@/utils/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Handle the callback for MagicLink sign in.
 * @note we use the PKCE flow for MagicLink sign in,
 * @see https://supabase.com/docs/guides/auth/auth-email-passwordless?queryGroups=language&language=js
 *
 * @param request - The incoming request.
 * @returns response - a next response object.
 */
export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);

	const tokenHash = requestUrl.searchParams.get("token_hash");
	if (!tokenHash) {
		return errorRedirect({
			url: new URL(PagePath.AUTH, requestUrl.origin),
			errorType: ErrorType.INVALID_CREDENTIALS,
			error: new Error("No token hash provided"),
		});
	}

	const supabase = getServerClient();

	const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
	if (error) {
		return errorRedirect({
			url: new URL(PagePath.AUTH, requestUrl.origin),
			errorType: ErrorType.UNEXPECTED_ERROR,
			error,
		});
	}

	return NextResponse.redirect(new URL(PagePath.ROOT, requestUrl.origin));
}
