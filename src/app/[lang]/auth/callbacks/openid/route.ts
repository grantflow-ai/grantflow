"use server";

import { PagePath } from "@/config/enums";
import { ErrorType } from "@/constants";
import { serverLogger as logger } from "@/utils/logging/server";
import { getServerClient } from "@/utils/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Handle the callback for OpenID sign in.
 * @param request - The incoming request.
 * @returns response - a next response object.
 */
export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");

	const url = new URL(PagePath.AUTH, requestUrl.origin);

	if (code) {
		const supabase = getServerClient();

		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (error) {
			url.searchParams.set("error", ErrorType.UNEXPECTED_ERROR);
			logger.debug(error, "Sign in failed");
		}

		return NextResponse.redirect(PagePath.ROOT);
	}
}
