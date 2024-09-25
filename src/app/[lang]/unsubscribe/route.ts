"use server";

import { PagePath } from "@/config/enums";
import { ErrorType } from "@/constants";
import { errorRedirect } from "@/utils/request";
import { getServerClient } from "@/utils/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Handle the callback for unsubscribing from a mailing list.
 *
 * @param request - The incoming request.
 * @returns response - a next response object.
 */
export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);

	const recordId = requestUrl.searchParams.get("record-id");

	if (!recordId) {
		return errorRedirect({
			url: new URL(PagePath.AUTH, requestUrl.origin),
			errorType: ErrorType.INVALID_IDENTIFIER,
			error: new Error("Invalid identifier"),
		});
	}

	const supabase = getServerClient();
	const client = supabase.from("mailing_list");
	try {
		await client.delete().eq("id", recordId);

		return NextResponse.redirect(new URL(PagePath.ROOT, requestUrl.origin));
	} catch {
		return errorRedirect({
			url: new URL(PagePath.AUTH, requestUrl.origin),
			errorType: ErrorType.UNEXPECTED_ERROR,
			error: new Error("Failed to delete mailing-list record"),
		});
	}
}
