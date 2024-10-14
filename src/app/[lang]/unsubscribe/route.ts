"use server";

import { PagePath } from "@/enums";
import { ErrorType } from "@/constants";
import { errorRedirect } from "@/utils/request";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "db/connection";
import { mailingList } from "db/schema";
import { eq } from "drizzle-orm";

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
			url: new URL(PagePath.SIGNIN, requestUrl.origin),
			errorType: ErrorType.INVALID_IDENTIFIER,
			error: new Error("Invalid identifier"),
		});
	}

	const db = await getDatabaseClient();
	try {
		await db.delete(mailingList).where(eq(mailingList.id, recordId));
		return NextResponse.redirect(new URL(PagePath.ROOT, requestUrl.origin));
	} catch {
		return errorRedirect({
			url: new URL(PagePath.SIGNIN, requestUrl.origin),
			errorType: ErrorType.UNEXPECTED_ERROR,
			error: new Error("Failed to delete mailing-list record"),
		});
	}
}
