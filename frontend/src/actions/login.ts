"use server";

import { cookies } from "next/headers";

import { SELECTED_ORGANIZATION_COOKIE, SESSION_COOKIE } from "@/constants";
import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api/server";
import { getEnv } from "@/utils/env";
import { getOrganizationFromJWT } from "@/utils/jwt";
import { log } from "@/utils/logger/server";

export async function login(idToken: string, isNewUser = false) {
	const started = Date.now();
	log.info("action_start", { action: "login", is_new_user: isNewUser });

	// For new users, add a small delay to allow Firebase to propagate user data
	if (isNewUser) {
		log.info("New user detected, waiting for Firebase propagation", { action: "login" });
		await sleep(1500);
	}

	try {
		const loginUrl = new URL("/login", getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL);
		const requestBody: API.Login.RequestBody = { id_token: idToken };

		const response = await getClient().post(loginUrl, { json: requestBody }).json<API.Login.Http201.ResponseBody>();

		const { is_backoffice_admin, jwt_token } = response;

		log.info("Backoffice admin status received from backend", {
			action: "login",
			is_backoffice_admin,
		});

		const cookieStore = await cookies();
		// Store JWT in httpOnly cookie
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

		try {
			const verifyUrl = new URL("/organizations", getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL);

			await getClient()
				.get(verifyUrl, {
					headers: { Authorization: `Bearer ${jwt_token}` },
				})
				.json();

			log.info("action_success", { action: "login", duration_ms: Date.now() - started });

			// Return admin status to client
			return { is_backoffice_admin };
		} catch (verifyError) {
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
		if (error instanceof Error && error.message === "NEXT_REDIRECT") {
			throw error;
		}

		log.error("action_failed", error, { action: "login", duration_ms: Date.now() - started });

		if (error instanceof Error) {
			throw new Error(error.message);
		}
		throw new Error("Login failed");
	}
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
