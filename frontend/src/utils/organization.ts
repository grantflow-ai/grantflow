import { cookies } from "next/headers";
import { SELECTED_ORGANIZATION_COOKIE, SESSION_COOKIE } from "@/constants";
import { getOrganizationFromJWT } from "./jwt";

export async function clearSelectedOrganization(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(SELECTED_ORGANIZATION_COOKIE);
}

export async function getCurrentOrganizationId(): Promise<null | string> {
	const cookieStore = await cookies();

	const selectedOrgCookie = cookieStore.get(SELECTED_ORGANIZATION_COOKIE);
	if (selectedOrgCookie?.value) {
		return selectedOrgCookie.value;
	}

	const sessionCookie = cookieStore.get(SESSION_COOKIE);
	if (sessionCookie?.value) {
		return getOrganizationFromJWT(sessionCookie.value);
	}

	return null;
}

export async function setSelectedOrganization(organizationId: string): Promise<void> {
	const cookieStore = await cookies();

	cookieStore.set(SELECTED_ORGANIZATION_COOKIE, organizationId, {
		httpOnly: false,
		maxAge: 60 * 60 * 24 * 30,
		path: "/",
		sameSite: "strict",
		secure: process.env.NODE_ENV === "production",
	});
}
