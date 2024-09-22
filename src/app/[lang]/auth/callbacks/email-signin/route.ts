"use server";

import { PagePath } from "@/config/enums";
import { ErrorType } from "@/constants";
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

	const supabase = getServerClient();

	if (!tokenHash) {
		const url = new URL(PagePath.AUTH, requestUrl.origin);
		url.searchParams.set("error", ErrorType.INVALID_CREDENTIALS);
		return NextResponse.redirect(url);
	}

	const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });

	if (error) {
		const url = new URL(PagePath.AUTH, requestUrl.origin);
		url.searchParams.set("error", ErrorType.UNEXPECTED_ERROR);
		return NextResponse.redirect(url);
	}

	return NextResponse.redirect(new URL(PagePath.ROOT, requestUrl.origin));
}
