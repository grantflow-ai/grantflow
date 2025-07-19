import { cookies } from "next/headers";
import { SELECTED_ORGANIZATION_COOKIE, SESSION_COOKIE } from "@/constants";
import { getOrganizationFromJWT } from "./jwt";

/**
 * Clear the selected organization cookie
 */
export async function clearSelectedOrganization(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(SELECTED_ORGANIZATION_COOKIE);
}

/**
 * Get the current organization ID from cookies or JWT
 * Priority: Cookie > JWT default > null
 */
export async function getCurrentOrganizationId(): Promise<null | string> {
	const cookieStore = await cookies();

	// First check if there's a selected organization in cookie
	const selectedOrgCookie = cookieStore.get(SELECTED_ORGANIZATION_COOKIE);
	if (selectedOrgCookie?.value) {
		return selectedOrgCookie.value;
	}

	// Fall back to JWT default organization
	const sessionCookie = cookieStore.get(SESSION_COOKIE);
	if (sessionCookie?.value) {
		return getOrganizationFromJWT(sessionCookie.value);
	}

	return null;
}

/**
 * Set the selected organization in a cookie
 */
export async function setSelectedOrganization(organizationId: string): Promise<void> {
	const cookieStore = await cookies();

	cookieStore.set(SELECTED_ORGANIZATION_COOKIE, organizationId, {
		httpOnly: false, // Accessible by client-side JS for organization switching
		maxAge: 60 * 60 * 24 * 30, // 30 days
		path: "/",
		sameSite: "strict",
		secure: process.env.NODE_ENV === "production",
	});
}
