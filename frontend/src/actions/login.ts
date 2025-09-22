"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SELECTED_ORGANIZATION_COOKIE, SESSION_COOKIE } from "@/constants";
import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api/server";
import { getEnv } from "@/utils/env";
import { getOrganizationFromJWT } from "@/utils/jwt";
import { log } from "@/utils/logger/server";
import { routes } from "@/utils/navigation";

export async function login(idToken: string) {
	const started = Date.now();
	log.info("action_start", { action: "login" });
	try {
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

		// Verify the user can access their organization data before redirecting
		try {
			const verifyUrl = new URL("/organizations", getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL);
			await getClient()
				.get(verifyUrl, {
					headers: { Authorization: `Bearer ${jwt_token}` },
				})
				.json();

			log.info("action_success", { action: "login", duration_ms: Date.now() - started });
			redirect(routes.organization.root());
		} catch (verifyError) {
			// If verification fails, remove the session cookie and throw an error
			const cookieStore = await cookies();
			cookieStore.delete(SESSION_COOKIE);
			cookieStore.delete(SELECTED_ORGANIZATION_COOKIE);

			log.warn("Login verification failed, removing session", {
				action: "login",
				duration_ms: Date.now() - started,
				error: verifyError instanceof Error ? verifyError.message : String(verifyError),
			});
			throw new Error("Authentication failed. Please try logging in again.");
		}
	} catch (error) {
		log.error("action_failed", error, { action: "login", duration_ms: Date.now() - started });

		// Don't redirect on login errors - let the client handle them
		if (error instanceof Error) {
			throw new Error(error.message);
		}
		throw new Error("Login failed");
	}
}
