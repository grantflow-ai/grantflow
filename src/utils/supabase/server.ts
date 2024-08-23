import { createServerClient } from "@supabase/ssr";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { cookies } from "next/headers";
import { cache } from "react";

import type { User } from "@/types/auth-types";
import type { DatabaseClient } from "@/types/database-types";
import { getEnv } from "@/utils/env";
import type { Database } from "gen/database-types";

const serverClientRef: {
	value: null | DatabaseClient;
} = { value: null };

/**
 * Get the Supabase server client.
 * @returns The Supabase server client.
 */
export function getServerClient() {
	const cookieStore = cookies();

	if (!serverClientRef.value) {
		serverClientRef.value = createServerClient<Database>(
			getEnv().NEXT_PUBLIC_SUPABASE_URL,
			getEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
			{
				cookies: {
					getAll() {
						return cookieStore.getAll();
					},
					setAll(cookiesToSet) {
						try {
							for (const { name, value, options } of cookiesToSet) {
								cookieStore.set(name, value, options as Partial<ResponseCookie>);
							}
						} catch {
							// The `setAll` method was called from a Server Component.
							// This can be ignored if you have middleware refreshing
							// user sessions.
						}
					},
				},
			},
		);
	}

	return serverClientRef.value;
}

export const getUser = cache(async (supabase: DatabaseClient): Promise<User | null> => {
	const {
		data: { user: authUser },
	} = await supabase.auth.getUser();

	if (!authUser) {
		return null;
	}

	const { data: appUser } = await supabase.from("app_users").select("*").eq("id", authUser.id).single();

	if (!appUser) {
		return null;
	}

	return { ...authUser, ...appUser } satisfies User;
});
