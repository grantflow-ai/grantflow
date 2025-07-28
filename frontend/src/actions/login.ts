"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SELECTED_ORGANIZATION_COOKIE, SESSION_COOKIE } from "@/constants";
import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { getEnv } from "@/utils/env";
import { getOrganizationFromJWT } from "@/utils/jwt";
import { routes } from "@/utils/navigation";

export async function login(idToken: string) {
	const loginUrl = new URL("/login", getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL);
	const requestBody: API.Login.RequestBody = { id_token: idToken };

	const { jwt_token } = await getClient()
		.post(loginUrl, { json: requestBody })
		.json<API.Login.Http201.ResponseBody>();

	const cookieStore = await cookies();
	cookieStore.set({
		httpOnly: true,
		maxAge: 60 * 60 * 24 * 7,
		name: SESSION_COOKIE,
		sameSite: "strict",
		secure: getEnv().NEXT_PUBLIC_SITE_URL.startsWith("https"),
		value: jwt_token,
	});

	const defaultOrganizationId = getOrganizationFromJWT(jwt_token);
	if (defaultOrganizationId && !cookieStore.get(SELECTED_ORGANIZATION_COOKIE)) {
		cookieStore.set({
			httpOnly: false,
			maxAge: 60 * 60 * 24 * 30,
			name: SELECTED_ORGANIZATION_COOKIE,
			sameSite: "strict",
			secure: getEnv().NEXT_PUBLIC_SITE_URL.startsWith("https"),
			value: defaultOrganizationId,
		});
	}

	redirect(routes.organization.root());
}
