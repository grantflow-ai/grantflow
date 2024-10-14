"use server";

import { isEmail } from "validator";

import { ApiPath } from "@/enums";
import { ErrorType } from "@/constants";
import { urlWithHost } from "@/utils/url";

/**
 * Sign out the current user.
 * @returns The path to redirect to.
 */
export async function signOut() {
	const { error } = await supabase.auth.signOut();

	return error?.message;
}

/**
 * Sign in with email OTP.
 * @param email - The user's email.
 * @returns An error message if there's an error, otherwise undefined.
 */
export async function signInWithEmail(email: string) {
	if (!isEmail(email)) {
		return ErrorType.INVALID_EMAIL;
	}

	const supabase = await getServerClient();
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: { emailRedirectTo: urlWithHost(ApiPath.CALLBACK_MAGIC_LINK) },
	});

	return error?.message;
}
