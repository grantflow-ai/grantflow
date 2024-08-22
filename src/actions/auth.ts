"use server";

import { isEmail, isMobilePhone } from "validator";

import { ApiPath, PagePath } from "@/config/enums";
import { ErrorType } from "@/constants";
import { getServerClient } from "@/utils/supabase/server";
import { urlWithHost } from "@/utils/url";
import type { AuthOtpResponse } from "@supabase/supabase-js";

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
export async function signInWithEmailOTP(email: string) {
	if (!isEmail(email)) {
		return ErrorType.INVALID_EMAIL;
	}

	const supabase = getServerClient();
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: {
			emailRedirectTo: urlWithHost(ApiPath.CALLBACK_OPENID),
		},
	});

	return error?.message;
}

/**
 * Verify email OTP.
 * @param email - The user's email.
 * @param otp - The one-time password.
 * @returns An error message if there's an error, otherwise undefined.
 */
export async function verifyEmailOTP(email: string, otp: string) {
	if (!isEmail(email)) {
		return ErrorType.INVALID_EMAIL;
	}

	const supabase = getServerClient();
	const { error } = await supabase.auth.verifyOtp({
		email,
		token: otp,
		type: "email",
	});

	return error?.message;
}

/**
 * Sign in with phone OTP.
 * @param phoneNumber - The user's phone number.
 * @returns An error message if there's an error, otherwise undefined.
 */
export async function signInWithPhoneOTP(phoneNumber: string): Promise<
	Partial<Pick<AuthOtpResponse, "data">> & {
		error?: string;
	}
> {
	if (!isMobilePhone(phoneNumber)) {
		return { error: ErrorType.INVALID_PHONE };
	}

	const supabase = getServerClient();
	const { error, data } = await supabase.auth.signInWithOtp({
		phone: phoneNumber,
		options: { channel: "sms" },
	});

	return { data, error: error?.message };
}

/**
 * Verify phone OTP.
 * @param phoneNumber - The user's phone number.
 * @param otp - The one-time password.
 * @returns An error message if there's an error, otherwise undefined.
 */
export async function verifyPhoneOTP(phoneNumber: string, otp: string) {
	if (!isMobilePhone(phoneNumber)) {
		return ErrorType.INVALID_PHONE;
	}

	const supabase = getServerClient();
	const { error } = await supabase.auth.verifyOtp({
		phone: phoneNumber,
		token: otp,
		type: "sms",
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
