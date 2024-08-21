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
			},
			experimental__runtimeEnv: {
				NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
				NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
				NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
				NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
			},
		});
	}
	return envRef.value;
}
