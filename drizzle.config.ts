import { defineConfig } from "drizzle-kit";
import { getEnv } from "@/utils/env";

export default defineConfig({
	dialect: "postgresql",
	schema: "./db/schema.ts",
	dbCredentials: {
		url: getEnv().DATABASE_CONNECTION_STRING,
	},
});
