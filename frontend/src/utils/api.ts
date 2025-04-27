import { ONE_MINUTE_IN_MS } from "@/constants";
import { Ref } from "@/utils/state";
import ky, { KyInstance } from "ky";
import { SESSION_COOKIE } from "@/constants";
import { PagePath } from "@/enums";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "@/utils/env";
import { HTTPError } from "ky";

const clientRef = new Ref<KyInstance>();

export function getClient(): KyInstance {
	clientRef.value ??= ky.create({
		prefixUrl: getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL,
		timeout: ONE_MINUTE_IN_MS * 10,
	});

	return clientRef.value;
}

export const createAuthHeaders = async () => {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(SESSION_COOKIE);
	if (!cookie?.value) {
		redirect(PagePath.SIGNIN);
	}
	return { Authorization: `Bearer ${cookie.value}` };
};

export const withAuthRedirect = async <T>(promise: Promise<T>): Promise<T> => {
	try {
		return await promise;
	} catch (error) {
		if (error instanceof HTTPError && error.response.status === 401) {
			redirect(PagePath.SIGNIN);
		}
		throw error;
	}
};
