"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/constants";
import { PagePath } from "@/enums";
import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { getEnv } from "@/utils/env";

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

	redirect(PagePath.PROJECTS);
}
