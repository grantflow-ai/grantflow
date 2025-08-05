import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
	dialect: "postgresql",
	// Generate both schema and relations files
	introspect: {
		casing: "camel",
	},
	out: "./drizzle",
	schema: "./src/db/schema.ts",
});
