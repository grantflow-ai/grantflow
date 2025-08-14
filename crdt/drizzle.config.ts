import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { config } from "@/utils/config";

export default defineConfig({
	dbCredentials: {
		url: config.DATABASE_URL,
	},
	dialect: "postgresql",
	// Generate both schema and relations files
	introspect: {
		casing: "camel",
	},
	out: "./drizzle",
	schema: "./src/db/schema.ts",
});
