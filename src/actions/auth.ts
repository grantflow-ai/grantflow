"use server";

import { isEmail } from "validator";

import { ApiPath, PagePath } from "@/config/enums";
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
 * @returns The path to redirect to.
 */
export async function signInWithEmailOTP(email: string) {
	const callbackURL = urlWithHost(ApiPath.CALLBACK_OPENID);

	if (!isEmail(email)) {
		return ErrorType.INVALID_EMAIL;
	}

	const supabase = getServerClient();
	const options = {
		emailRedirectTo: callbackURL,
		shouldCreateUser: false,
	};

	const { error } = await supabase.auth.signInWithOtp({
		email,
		options,
	});

	return error?.message;
}

/**
 * Request a password update.
 * @param email - The user's email.
 * @returns The path to redirect to.
 */
export async function requestPasswordUpdate(email: string) {
	const callbackURL = urlWithHost(ApiPath.CALLBACK_PASSWORD_RESET);

	if (!isEmail(email)) {
		return ErrorType.INVALID_EMAIL;
	}

	const supabase = getServerClient();

	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: callbackURL,
	});

	return error?.message;
}

/**
 * Sign in with password.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns The path to redirect to.
 */
export async function signInWithPassword(email: string, password: string) {
	const supabase = getServerClient();
	const { error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	return error?.message;
}

/**
 * Sign up with email and password.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns The path to redirect to.
 */
export async function signUp(email: string, password: string) {
	if (!isEmail(email)) {
		return ErrorType.INVALID_EMAIL;
	}

	const supabase = getServerClient();
	const { error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			emailRedirectTo: urlWithHost(PagePath.ROOT),
		},
	});

	return error?.message;
}

/**
 * Update the user's password.
 * @param password - The new password.
 * @param passwordConfirm - Confirmation of the new password.
 * @returns The path to redirect to.
 */
export async function updatePassword(password: string, passwordConfirm: string) {
	if (password !== passwordConfirm) {
		return ErrorType.PASSWORD_MISMATCH;
	}

	const supabase = getServerClient();
	const { error } = await supabase.auth.updateUser({
		password,
	});

	return error?.message;
}
