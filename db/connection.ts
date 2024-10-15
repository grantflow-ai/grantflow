import { getEnv } from "@/utils/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { Ref } from "@/utils/state";
import * as schema from "./schema";
import postgres from "postgres";
const ref = new Ref<ReturnType<typeof drizzle<typeof schema>>>();

/**
 * Get the database connection.
 */
export function getDatabaseClient() {
	if (!ref.value) {
		const client = postgres(getEnv().DATABASE_CONNECTION_STRING);
		ref.value = drizzle(client, {
			schema,
		});
	}
	return ref.value;
}
