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
export async function subscribeToMailingList(email: string): Promise<string | null> {
	if (!isEmail(email)) {
		return ErrorType.INVALID_EMAIL;
	}
	try {
		const supabase = getServerClient();
		const client = supabase.from("mailing_list");
		await client.insert({
			email,
		});
		return null;
	} catch (error) {
		return handleServerError(error as Error, (error as Error).message);
	}
}
