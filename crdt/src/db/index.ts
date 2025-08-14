import { drizzle } from "drizzle-orm/node-postgres";

import { config } from "@/utils/config";

export const db = drizzle({
	connection: {
		connectionString: config.DATABASE_URL,
	},
});

export * from "./relations";
export * from "./schema";
