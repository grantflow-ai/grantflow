"use server";

import { ErrorType } from "@/constants";
import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";
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
	const supabase = await getServerClient();
	const client = supabase.from("mailing_list");
	const { error } = await client.insert({
		email,
	});
	if (error) {
		return handleServerError(error, { message: "Failed to subscribe to mailing list" });
	}
	return null;
}
