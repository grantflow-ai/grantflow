"use server";

import { cookies } from "next/headers";
import { SELECTED_ORGANIZATION_COOKIE } from "@/constants";
import { log } from "@/utils/logger/server";

/**
 * Get the selected organization ID from cookies (server-side)
 * @returns The organization ID or null if not found
 */
export async function getSelectedOrgFromCookies(): Promise<null | string> {
	const cookieStore = await cookies();
	const orgCookie = cookieStore.get(SELECTED_ORGANIZATION_COOKIE);

	if (!orgCookie?.value) {
		log.info("No organization selected", {
			cookie_name: SELECTED_ORGANIZATION_COOKIE,
		});
		return null;
	}

	return orgCookie.value;
}
