"use server";

import { isEmail } from "validator";

import { ErrorType } from "@/constants";

/**
 * Sign out the current user.
 * @returns The path to redirect to.
 */
export async function signOut() {
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

	return error?.message;
}
