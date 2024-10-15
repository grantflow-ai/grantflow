/*
 * see: https://authjs.dev/getting-started/migrating-to-v5#edge-compatibility
 * */

import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export const authConfig = { providers: [Google] } satisfies NextAuthConfig;
