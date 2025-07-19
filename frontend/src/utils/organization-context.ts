"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SELECTED_ORGANIZATION_COOKIE } from "@/constants";
import { PagePath } from "@/enums";
import { log } from "@/utils/logger";

/**
 * Get the selected organization ID from cookies (server-side)
 * @returns The organization ID or null if not found
 */
export async function getOrganizationId(): Promise<null | string> {
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

/**
 * Get the selected organization ID from cookies or redirect if not found (server-side)
 * @param redirectPath - Path to redirect to if no organization is selected
 * @returns The organization ID
 */
export async function getOrganizationIdOrRedirect(redirectPath: PagePath = PagePath.PROJECTS): Promise<string> {
	const organizationId = await getOrganizationId();

	if (!organizationId) {
		log.warn("No organization selected, redirecting", {
			redirect_path: redirectPath,
		});
		redirect(redirectPath);
	}

	return organizationId;
}
