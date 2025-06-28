"use server";

import { HTTPError } from "ky";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/constants";
import { PagePath } from "@/enums";
import { logError } from "@/utils/logging";

// eslint-disable-next-line @typescript-eslint/require-await
export async function redirectWithToastParams({
	message,
	path,
	type,
}: {
	message: string;
	path: PagePath | string;
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
	path: PagePath | string;
	value: Promise<T>;
}): Promise<T> {
	try {
		return await value;
	} catch (error) {
		logError({ error, identifier });
		await redirectWithToastParams({ message, path, type: "error" });
		throw error;
	}
}

export const createAuthHeaders = async () => {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(SESSION_COOKIE);

	if (!cookie?.value) {
		redirect(PagePath.ONBOARDING);

		return { Authorization: "Bearer test-token" };
	}
	return { Authorization: `Bearer ${cookie.value}` };
};

export const withAuthRedirect = async <T>(promise: Promise<T>): Promise<T> => {
	try {
		return await promise;
	} catch (error) {
		if (error instanceof HTTPError && error.response.status === 401) {
			redirect(PagePath.ONBOARDING);
		}
		throw error;
	}
};