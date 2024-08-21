import type { ApiPath, PagePath } from "@/config/enums";
import { getEnv } from "@/utils/env";

/**
 * Get a normalized URL string composted of the site URL and path.
 * @param path - The path to append to the site URL.
 * @returns - The normalized URL string.
 */
export function urlWithHost(path: string | PagePath | ApiPath) {
	return new URL(path, getEnv().NEXT_PUBLIC_SITE_URL).toString();
}
