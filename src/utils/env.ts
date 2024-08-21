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
			client: {
				NEXT_PUBLIC_SITE_URL: z.string().url("Please enter a valid URL"),
				NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
				NEXT_PUBLIC_SUPABASE_URL: z.string().url("Please enter a valid URL"),
			},
			shared: {
				NEXT_PUBLIC_SITE_NAME: z.string(),
				NEXT_PUBLIC_METADATA: z.string(),
				NEXT_PUBLIC_METADATA_DESCRIPTION: z.string(),
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
				NEXT_PUBLIC_ENABLE_EMAIL_OTP_SIGNIN: z.coerce.boolean().optional().default(true),
				NEXT_PUBLIC_ENABLE_PASSWORD_AUTH: z.coerce.boolean().optional().default(true),
				NEXT_PUBLIC_ENABLE_OAUTH_SIGNIN: z.coerce.boolean().optional().default(true),
			},
			experimental__runtimeEnv: {
				NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
				NEXT_PUBLIC_METADATA: process.env.NEXT_PUBLIC_METADATA,
				NEXT_PUBLIC_METADATA_DESCRIPTION: process.env.NEXT_PUBLIC_METADATA_DESCRIPTION,
				NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
				NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
				NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
				NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
				NEXT_PUBLIC_ENABLE_EMAIL_OTP_SIGNIN: process.env.NEXT_PUBLIC_ENABLE_EMAIL_OTP_SIGNIN,
				NEXT_PUBLIC_ENABLE_PASSWORD_AUTH: process.env.NEXT_PUBLIC_ENABLE_PASSWORD_AUTH,
				NEXT_PUBLIC_ENABLE_OAUTH_SIGNIN: process.env.NEXT_PUBLIC_ENABLE_OAUTH_SIGNIN,
			},
		});
	}
	return envRef.value;
}

/**
 * Retrieves an environment variable or a default value if it is not set.
 * @param key - The key of the environment variable.
 * @param defaultValue - The default value to return if the environment variable is not set.
 */
export function getEnvWithDefault<K extends keyof Env>(key: K, defaultValue: Env[K]): Env[K] {
	const value = getEnv()[key];
	return value || defaultValue;
}
