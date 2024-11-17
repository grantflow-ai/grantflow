import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import type { Env } from "@/types/env-types";

const envRef: { value: null | Readonly<Env> } = { value: null };

/**
 * Parse and validate the environment variables.
 * @returns - An object literal with the environment variables.
 */
export function getEnv(): Env {
	if (envRef.value === null) {
		envRef.value = createEnv({
			server: {
				AZURE_STORAGE_ACCOUNT_NAME: z.string(),
				AZURE_STORAGE_ACCOUNT_KEY: z.string(),
				AZURE_STORAGE_CONTAINER_NAME: z.string(),
				AUTH_GOOGLE_ID: z.string(),
				AUTH_GOOGLE_SECRET: z.string(),
				DATABASE_CONNECTION_STRING: z.string(),
				AUTH_SECRET: z.string(),
				AUTH_RESEND_KEY: z.string(),
				BACKEND_API_BASE_URL: z.string(),
				BACKEND_API_TOKEN: z.string(),
			},
			client: {
				NEXT_PUBLIC_SITE_URL: z.string().url("Please enter a valid URL"),
			},
			shared: {
				NEXT_PUBLIC_DEBUG: z
					.preprocess((val) => {
						if (typeof val === "string") {
							if (val.toLowerCase() === "true") {
								return true;
							}
							if (val.toLowerCase() === "false") {
								return false;
							}
						}
						return val;
					}, z.boolean())
					.optional(),
				NEXT_PUBLIC_IS_DEVELOPMENT: z.boolean().optional().default(false),
			},
			experimental__runtimeEnv: {
				NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
				NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
				NEXT_PUBLIC_IS_DEVELOPMENT: !!process.env.NEXT_PUBLIC_IS_DEVELOPMENT,
			},
		});
	}
	return envRef.value;
}
