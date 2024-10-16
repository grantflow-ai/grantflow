"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { PagePath } from "@/enums";
import { redirectWithToastParams } from "@/utils/server-side";

/**
 * Server action to sign in the user using resend.
 */
export async function signInWithResend(email: string) {
	try {
		await signIn("resend", {
			email,
			redirect: false,
		});
		return redirectWithToastParams({
			path: PagePath.ROOT,
			type: "success",
			content: "A magic link has been sent to your email.",
		});
	} catch (error) {
		if (error instanceof AuthError) {
			return redirectWithToastParams({
				path: PagePath.SIGNIN,
				type: "error",
				content: "Failed to send magic link. Please try again.",
			});
		}

		// next redirects using exceptions in actions
		throw error;
	}
}
