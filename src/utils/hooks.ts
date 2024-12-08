import { useMemo } from "react";
import { ApiClient } from "@/utils/api-client";
import { KyRequest } from "ky";
import { getFirebaseIdToken } from "@/utils/firebase";

async function beforeRequestAuthHook(request: KyRequest) {
	try {
		const token = await getFirebaseIdToken();
		request.headers.set("Authorization", `Bearer ${token}`);
		return request;
	} catch (error) {
		console.error("User is not authenticated", error);
		return new Response("User is not authenticated", { status: 401 });
	}
}

/**
 * Hook to get the API client instance.
 * @returns - The API client instance.
 */
export function useApiClient(): ApiClient {
	return useMemo(() => new ApiClient(beforeRequestAuthHook), []);
}
