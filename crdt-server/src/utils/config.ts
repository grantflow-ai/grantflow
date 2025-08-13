import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	NODE_ENV: z.enum(["development", "production"]),
	PORT: z.coerce.number().default(8080),
});

export const config = envSchema.parse(process.env);
