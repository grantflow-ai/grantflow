import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	NODE_ENV: z.enum(["development", "production"]),
	PORT: z.coerce.number().default(8080),
});

const rawConfig = envSchema.parse(process.env);

// Normalize the database URL for node-postgres
// Remove SQLAlchemy-specific dialect suffixes like +asyncpg
const normalizedDatabaseUrl = rawConfig.DATABASE_URL.replace(/\+[^:/]+/, "");

export const config = {
	...rawConfig,
	DATABASE_URL: normalizedDatabaseUrl,
};
