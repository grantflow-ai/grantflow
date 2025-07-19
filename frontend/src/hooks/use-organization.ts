"use client";

import { useRouter } from "next/navigation";
import { useCookies } from "react-cookie";
import { SELECTED_ORGANIZATION_COOKIE } from "@/constants";

export function useOrganization() {
	const [cookies, setCookie, removeCookie] = useCookies([SELECTED_ORGANIZATION_COOKIE]);
	const router = useRouter();

	const selectedOrganizationId = (cookies[SELECTED_ORGANIZATION_COOKIE] as string | undefined) ?? null;

	const switchOrganization = (organizationId: string) => {
		setCookie(SELECTED_ORGANIZATION_COOKIE, organizationId, {
			maxAge: 60 * 60 * 24 * 30, // 30 days
			path: "/",
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
		});

		// Refresh the page to update all API calls with new organization
		router.refresh();
	};

	const clearOrganization = () => {
		removeCookie(SELECTED_ORGANIZATION_COOKIE, { path: "/" });
		router.refresh();
	};

	return {
		clearOrganization,
		selectedOrganizationId: selectedOrganizationId as null | string,
		switchOrganization,
	};
}
