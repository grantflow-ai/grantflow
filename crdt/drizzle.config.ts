import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { config } from "@/utils/config";

export default defineConfig({
	dbCredentials: {
		url: config.DATABASE_URL,
	},
	dialect: "postgresql",
	introspect: {
		casing: "camel",
	},
	out: "./drizzle",
	schema: "./src/db.ts",
});
