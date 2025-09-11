"use server";

import { HTTPError } from "ky";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { COOKIE_CONSENT, SESSION_COOKIE } from "@/constants";
import type { CookieConsentData } from "@/hooks/use-cookie-consent";
import { log } from "@/utils/logger/server";
import { routes } from "@/utils/navigation";

export async function checkCookieConsent(): Promise<boolean> {
	const cookieStore = await cookies();
	const consentCookie = cookieStore.get(COOKIE_CONSENT);

	if (!consentCookie?.value) {
		return false;
	}

	try {
		const consentData = JSON.parse(consentCookie.value) as CookieConsentData;
		return consentData.consentGiven && consentData.hasInteracted;
	} catch (error) {
		log.warn("Invalid consent cookie format, clearing cookie", {
			cookie_name: COOKIE_CONSENT,
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function redirectWithToastParams({
	message,
	path,
	type,
}: {
	message: string;
	path: string;
	type: "error" | "info" | "success";
}) {
	redirect(`${path}?toastType=${type}&toastContent=${message}`);
}

export async function withErrorToast<T>({
	identifier,
	message,
	path,
	value,
}: {
	identifier: string;
	message: string;
	path: string;
	value: Promise<T>;
}): Promise<T> {
	try {
		return await value;
	} catch (error) {
		log.error(identifier, error);
		await redirectWithToastParams({ message, path, type: "error" });
		throw error;
	}
}

export const createAuthHeaders = async () => {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(SESSION_COOKIE);

	if (!cookie?.value) {
		log.warn("No session cookie found, redirecting to onboarding", {
			cookie_name: SESSION_COOKIE,
			redirect_path: routes.onboarding(),
		});
		redirect(routes.onboarding());
	}

	log.info("Auth headers created", {
		cookie_name: SESSION_COOKIE,
		has_cookie: true,
	});

	return { Authorization: `Bearer ${cookie.value}` };
};

export const withAuthRedirect = async <T>(promise: Promise<T>): Promise<T> => {
	const hasConsent = await checkCookieConsent();

	if (!hasConsent) {
		log.warn("No cookie consent found, redirecting to onboarding", {
			cookie_name: COOKIE_CONSENT,
			redirect_path: routes.onboarding(),
		});
		redirect(routes.onboarding());
	}

	try {
		return await promise;
	} catch (error) {
		if (error instanceof HTTPError && error.response.status === 401) {
			log.warn("Unauthorized request, redirecting to onboarding", {
				redirect_path: routes.onboarding(),
				status: error.response.status,
				url: error.request.url,
			});
			redirect(routes.onboarding());
		}

		log.error("API request failed", error, {
			is_http_error: error instanceof HTTPError,
			status: error instanceof HTTPError ? error.response.status : undefined,
			url: error instanceof HTTPError ? error.request.url : undefined,
		});

		throw error;
	}
};
