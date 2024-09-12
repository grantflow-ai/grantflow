"use server";

import { ErrorType } from "@/constants";
import isEmail from "validator/lib/isEmail";

/**
 * Subscribes a user to the mailing list.
 * @param email - The email address of the user to subscribe.
 * @returns - The result of the subscription.
 */
export async function subscribeToMailingList(email: string) {
	if (!isEmail(email)) {
		return ErrorType.INVALID_EMAIL;
	}
	try {
		await new Promise((resolve) => setTimeout(resolve, 1000));
	} catch (error) {
		return (error as Error).message;
	}
}
