"use server";

import { PagePath } from "@/enums";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "db/connection";
import { mailingList } from "db/schema";
import { eq } from "drizzle-orm";
import { redirectWithToastParams } from "@/utils/server-side";

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
		return redirectWithToastParams({
			path: new URL(PagePath.SIGNIN, requestUrl.origin).toString(),
			type: "error",
			content: "Something went wrong",
		});
	}

	const db = getDatabaseClient();
	try {
		await db.delete(mailingList).where(eq(mailingList.id, recordId));
		return NextResponse.redirect(new URL(PagePath.ROOT, requestUrl.origin));
	} catch {
		return redirectWithToastParams({
			path: new URL(PagePath.SIGNIN, requestUrl.origin).toString(),
			type: "error",
			content: "Something went wrong",
		});
	}
}
