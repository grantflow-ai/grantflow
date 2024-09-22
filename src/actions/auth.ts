"use server";

import { isEmail } from "validator";

import { ApiPath } from "@/config/enums";
import { ErrorType } from "@/constants";
import { getServerClient } from "@/utils/supabase/server";
import { urlWithHost } from "@/utils/url";

/**
 * Sign out the current user.
 * @returns The path to redirect to.
 */
export async function signOut() {
	const supabase = getServerClient();
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

	const supabase = getServerClient();
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: { emailRedirectTo: urlWithHost(ApiPath.CALLBACK_MAGIC_LINK) },
	});

	return error?.message;
}
