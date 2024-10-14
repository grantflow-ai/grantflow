import { getEnv } from "@/utils/env";
import { drizzle } from "drizzle-orm/connect";
import { Ref } from "@/utils/state";

const ref = new Ref<Awaited<ReturnType<typeof drizzle<"node-postgres">>>>();

/**
 * Get the database connection.
 */
export async function getClient() {
	if (!ref.value) {
		ref.value = await drizzle("node-postgres", getEnv().DATABASE_CONNECTION_STRING);
	}
	return ref.value;
}
