/*
 * see: https://authjs.dev/getting-started/migrating-to-v5#edge-compatibility
 * */

import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDatabaseClient } from "db/connection";
import { accounts, sessions, users, verificationTokens } from "db/schema";

export const authConfig = { providers: [Google] } satisfies NextAuthConfig;

/**
 *
 */
export function createDrizzleAdapter() {
	return DrizzleAdapter(getDatabaseClient(), {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens,
	});
}
