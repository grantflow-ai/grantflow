"use server";

import type { z } from "zod";
import { WAITING_LIST_RESPONSE_CODES } from "@/enums";
import type { waitlistSchema } from "@/schemas/waitlist-schema";

export async function addToWaitlist(_formData: z.infer<typeof waitlistSchema>): Promise<{
	code: WAITING_LIST_RESPONSE_CODES;
	error?: { email?: string[]; name?: string[] } | null;
	message?: string;
}> {
	// Email is now sent via Segment integration with Mailchimp
	// No need for duplicate email via Resend
	return await Promise.resolve({
		code: WAITING_LIST_RESPONSE_CODES.SUCCESS,
	});
}
