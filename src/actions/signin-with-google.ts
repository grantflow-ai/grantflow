"use server";

import { signIn } from "@/auth/helpers";

/**
 * Server action to sign in with Google.
 */
export async function signInWithGoogle() {
	await signIn("google");
}
