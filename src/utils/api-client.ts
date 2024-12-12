import ky, { KyInstance } from "ky";

import { getEnv } from "@/utils/env";
import { Ref } from "@/utils/state";

const clientRef = new Ref<KyInstance>();

/**
 * Get the API client instance.
 *
 * @returns - The API client instance.
 */
export function getClient(): KyInstance {
	if (!clientRef.value) {
		clientRef.value = ky.create({
			prefixUrl: getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL,
			headers: { "Content-Type": "application/json" },
		});
	}
	return clientRef.value;
}
