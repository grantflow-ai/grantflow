"use server";

import { handleServerError } from "@/utils/server-side";
import isEmail from "validator/lib/isEmail";
import { getDatabaseClient } from "db/connection";
import { mailingList } from "db/schema";

/**
 * Subscribes a user to the mailing list.
 * @param email - The email address of the user to subscribe.
 * @returns - The result of the subscription.
 */
export async function subscribeToMailingList(email: string) {
	if (!isEmail(email)) {
		return handleServerError(new Error("Invalid email address"), { returnValue: "Invalid email address" });
	}
	const db = getDatabaseClient();

	try {
		await db.insert(mailingList).values({ email }).execute();
		return null;
	} catch (error) {
		return handleServerError(error as Error, {
			message: "Error adding email to mailing list",
			returnValue: "Failed to subscribe to mailing list",
		});
	}
}
