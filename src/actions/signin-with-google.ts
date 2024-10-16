"use server";

import { signIn } from "@/auth";
import { PagePath } from "@/enums";
import { AuthError } from "next-auth";

import { redirectWithToastParams } from "@/utils/server-side";

/**
 * Server action to sign in with Google.
 */
export async function signInWithGoogle() {
	try {
		await signIn("google", {
			redirectTo: PagePath.WORKSPACES,
		});
	} catch (error) {
		if (error instanceof AuthError) {
			return redirectWithToastParams({
				path: PagePath.SIGNIN,
				type: "error",
				content: "Something went wrong. Please try again.",
				strategy: "cookies",
			});
		}

		// next redirects using exceptions in actions
		throw error;
	}
}
