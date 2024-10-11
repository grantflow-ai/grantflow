"use server";

import { ErrorType } from "@/constants";
import { PagePath } from "@/enums";
import { errorRedirect } from "@/utils/request";
import { getServerClient } from "@/utils/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Handle the callback for OpenID sign in.
 * @see https://supabase.com/docs/guides/auth/social-login
 *
 * @param request - The incoming request.
 * @returns response - a next response object.
 */
export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);

	const code = requestUrl.searchParams.get("code");
	if (!code) {
		return errorRedirect({
			url: new URL(PagePath.AUTH, requestUrl.origin),
			errorType: ErrorType.INVALID_CREDENTIALS,
			error: new Error("No code provided"),
		});
	}

	const supabase = await getServerClient();

	const { error } = await supabase.auth.exchangeCodeForSession(code);
	if (error) {
		return errorRedirect({
			url: new URL(PagePath.AUTH, requestUrl.origin),
			errorType: ErrorType.UNEXPECTED_ERROR,
			error,
		});
	}

	return NextResponse.redirect(new URL(PagePath.WORKSPACES, requestUrl.origin));
}
