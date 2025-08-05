import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	CRDT_SERVER_NAME: z.string().default('grantflow'),
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	NODE_ENV: z.enum(["development", "production"]),
	PORT: z.coerce.number().default(1234),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
	throw parsed.error;
}

export const config = parsed.data;
