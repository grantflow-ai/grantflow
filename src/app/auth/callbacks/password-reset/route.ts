import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { PagePath } from "@/config/enums";
import { ErrorType } from "@/constants";
import { getServerClient } from "@/utils/supabase/server";

/**
 * Handle the callback for password reset.
 * @param request - The incoming request.
 * @returns response - a next response object.
 */
export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	const url = new URL(`${requestUrl.origin}${PagePath.AUTH_FORGOT_PASSWORD}`);

	if (code) {
		const supabase = getServerClient();

		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (error) {
			url.searchParams.set("error", ErrorType.UNEXPECTED_ERROR);
		}
	}

	return NextResponse.redirect(url.toString());
}
