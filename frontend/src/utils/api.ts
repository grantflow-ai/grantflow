import { ONE_MINUTE_IN_MS } from "@/constants";
import { Ref } from "@/utils/state";
import ky, { KyInstance } from "ky";
import { getEnv } from "@/utils/env";

const clientRef = new Ref<KyInstance>();

export function getClient(): KyInstance {
	clientRef.value ??= ky.create({
		prefixUrl: getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL,
		timeout: ONE_MINUTE_IN_MS * 10,
	});

	return clientRef.value;
}
