"use server";

import { PagePath } from "@/enums";
import { getServerClient } from "@/utils/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Handle user logout.
 *
 * @param request - The incoming request.
 * @returns response - a next response object.
 */
export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);

	const client = await getServerClient();
	await client.auth.signOut();
	return NextResponse.redirect(new URL(PagePath.ROOT, requestUrl.origin));
}
