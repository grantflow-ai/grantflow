import { getEnv } from "@/utils/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Ref } from "@/utils/state";
import * as schema from "./schema";
import { Pool } from "pg";
const ref = new Ref<ReturnType<typeof drizzle<typeof schema>>>();

/**
 * Get the database connection.
 */
export function getDatabaseClient() {
	if (!ref.value) {
		const pool = new Pool({ connectionString: getEnv().DATABASE_CONNECTION_STRING });
		ref.value = drizzle(pool, {
			schema,
		});
	}
	return ref.value;
}
