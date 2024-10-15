"use server";

import { signIn } from "@/auth/helpers";

/**
 * Server action to send a magic link.
 */
export async function sendMagicLink(formData: FormData) {
	await signIn("resend", formData);
}
