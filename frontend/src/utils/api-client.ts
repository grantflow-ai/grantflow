import { ONE_MINUTE_IN_MS } from "@/constants";
import { getEnv } from "@/utils/env";
import { Ref } from "@/utils/state";
import ky, { KyInstance } from "ky";

const clientRef = new Ref<KyInstance>();

/**
 * Get the API client instance.
 *
 * @returns - The API client instance.
 */
export function getClient(): KyInstance {
	clientRef.value ??= ky.create({
		prefixUrl: getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL,
		timeout: ONE_MINUTE_IN_MS * 10,
	});

	return clientRef.value;
}
