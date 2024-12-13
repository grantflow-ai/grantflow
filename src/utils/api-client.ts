import ky, { KyInstance } from "ky";

import { getEnv } from "@/utils/env";
import { Ref } from "@/utils/state";
import { ONE_MINUTE_IN_MS } from "@/constants";

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
			timeout: ONE_MINUTE_IN_MS * 10,
		});
	}
	return clientRef.value;
}
