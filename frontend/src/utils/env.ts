import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import type { Env } from "@/types/env-types";

const envRef: { value: null | Readonly<Env> } = { value: null };

export function getEnv(): Env {
	envRef.value ??= createEnv({
		client: {
			NEXT_PUBLIC_FIREBASE_API_KEY: z.string(),
			NEXT_PUBLIC_FIREBASE_APP_ID: z.string(),
			NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string(),
			NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string(),
			NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID: z.string(),
			NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID: z.string(),
			NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string(),
			NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string(),
			NEXT_PUBLIC_MAILGUN_API_KEY: z.string(),
			NEXT_PUBLIC_SEGMENT_WRITE_KEY: z.string(),
			NEXT_PUBLIC_SITE_URL: z.string().url("Please enter a valid URL"),
		},
		experimental__runtimeEnv: {
			NEXT_PUBLIC_BACKEND_API_BASE_URL: process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL,
			NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
			NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
			NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
			NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
			NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
			NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID,
			NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID: process.env.NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID,
			NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
			NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
			NEXT_PUBLIC_GCS_EMULATOR_URL: process.env.NEXT_PUBLIC_GCS_EMULATOR_URL,
			NEXT_PUBLIC_MAILGUN_API_KEY: process.env.NEXT_PUBLIC_MAILGUN_API_KEY,
			NEXT_PUBLIC_MOCK_API: process.env.NEXT_PUBLIC_MOCK_API,
			NEXT_PUBLIC_SEGMENT_WRITE_KEY: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY,
			NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
		},
		shared: {
			NEXT_PUBLIC_BACKEND_API_BASE_URL: z.string().url("Please enter a valid URL"),
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
				.optional()
				.default(false),
			NEXT_PUBLIC_GCS_EMULATOR_URL: z.string().url("Please enter a valid URL").optional(),
			NEXT_PUBLIC_MOCK_API: z
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
				.optional()
				.default(false),
		},
	});

	return envRef.value;
}