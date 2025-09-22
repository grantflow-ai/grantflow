"use client";

import { useRouter } from "next/navigation";

// eslint-disable-next-line import-x/no-unresolved
import { useCookies } from "react-cookie";
import { SELECTED_ORGANIZATION_COOKIE } from "@/constants";

export function useOrgCookie() {
	const [cookies, setCookie, removeCookie] = useCookies([SELECTED_ORGANIZATION_COOKIE]);
	const router = useRouter();

	const selectedOrganizationId = (cookies[SELECTED_ORGANIZATION_COOKIE] as string | undefined) ?? null;

	const setOrganizationCookie = (organizationId: string) => {
		setCookie(SELECTED_ORGANIZATION_COOKIE, organizationId, {
			maxAge: 60 * 60 * 24 * 30,
			path: "/",
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
		});

		router.refresh();
	};

	const clearOrganizationCookie = () => {
		removeCookie(SELECTED_ORGANIZATION_COOKIE, { path: "/" });
		router.refresh();
	};

	return {
		clearOrganizationCookie,
		selectedOrganizationId,
		setOrganizationCookie,
	};
}
