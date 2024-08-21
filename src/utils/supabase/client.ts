import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getEnv } from "@/utils/env";
import type { Database } from "gen/database-types";

const browserClientRef: {
	value: null | SupabaseClient<Database, "public", Database["public"]>;
} = { value: null };

/**
 * Get the Supabase browser client.
 * @returns The Supabase browser client.
 */
export function getBrowserClient() {
	if (!browserClientRef.value) {
		browserClientRef.value = createBrowserClient<Database, "public", Database["public"]>(
			getEnv().NEXT_PUBLIC_SUPABASE_URL,
			getEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
		);
	}

	return browserClientRef.value;
}
