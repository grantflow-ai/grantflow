import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/utils/env";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

export const { handlers, signIn, signOut, auth } = NextAuth({
	adapter: DrizzleAdapter(drizzle(postgres(getEnv().DATABASE_CONNECTION_STRING, { max: 1 }))),
	providers: [Google],
});
