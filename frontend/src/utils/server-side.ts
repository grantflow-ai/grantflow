"use server";

import { HTTPError } from "ky";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/constants";
import { PagePath } from "@/enums";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";

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
		log.error(identifier, error);
		await redirectWithToastParams({ message, path, type: "error" });
		throw error;
	}
}

export const createAuthHeaders = async () => {
	if (getEnv().NEXT_PUBLIC_MOCK_AUTH) {
		const mockToken =
			// eslint-disable-next-line sonarjs/no-hardcoded-secrets
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2NrLXVzZXItdWlkLTEyMyIsIm5hbWUiOiJUZXN0IFVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3MzU1NTY0MDAsImV4cCI6MTczNjE2MTIwMH0.mock-signature";
		return { Authorization: `Bearer ${mockToken}` };
	}

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
		if (getEnv().NEXT_PUBLIC_MOCK_AUTH) {
			throw error;
		}

		if (error instanceof HTTPError && error.response.status === 401) {
			redirect(PagePath.ONBOARDING);
		}
		throw error;
	}
};
