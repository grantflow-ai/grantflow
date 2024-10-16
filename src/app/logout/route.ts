"use server";

import { PagePath } from "@/enums";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { signOut } from "@/auth";

/**
 * Handle user logout.
 *
 * @param request - The incoming request.
 * @returns response - a next response object.
 */
export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);

	await signOut();

	return NextResponse.redirect(new URL(PagePath.ROOT, requestUrl.origin));
}
