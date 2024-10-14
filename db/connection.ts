import { getEnv } from "@/utils/env";
import { drizzle } from "drizzle-orm/connect";
import { Ref } from "@/utils/state";
import * as schema from "./schema";
const ref = new Ref<Awaited<ReturnType<typeof drizzle<"postgres-js", typeof schema>>>>();

/**
 * Get the database connection.
 */
export async function getDatabaseClient() {
	if (!ref.value) {
		ref.value = await drizzle("postgres-js", {
			connection: getEnv().DATABASE_CONNECTION_STRING,
			schema,
		});
	}
	return ref.value;
}
