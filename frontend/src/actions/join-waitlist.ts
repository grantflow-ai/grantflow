"use server";

import { Resend } from "resend";
import type { z } from "zod";
import { WaitlistEmail } from "@/emails/waitlist-email";
import { WAITING_LIST_RESPONSE_CODES } from "@/enums";
import type { waitlistSchema } from "@/schemas/waitlist-schema";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";

const resend = new Resend(getEnv().RESEND_API_KEY);

export async function addToWaitlist(formData: z.infer<typeof waitlistSchema>): Promise<{
	code: WAITING_LIST_RESPONSE_CODES;
	error?: { email?: string[]; name?: string[] } | null;
	message?: string;
}> {
	const emailDeliveryError = await sendConfirmationEmail(formData);

	if (emailDeliveryError) {
		log.error("Waitlist error", {
			error: `Failed to send confirmation email: ${emailDeliveryError.message}`,
			identifier: "addToWaitlist",
		});

		return {
			code: WAITING_LIST_RESPONSE_CODES.SERVER_ERROR,
		};
	}

	return {
		code: WAITING_LIST_RESPONSE_CODES.SUCCESS,
	};
}

async function sendConfirmationEmail({ email, name }: { email: string; name: string }): Promise<Error | null> {
	try {
		const { error } = await resend.emails.send({
			from: "noreply@grantflow.ai",
			react: WaitlistEmail({
				logoUrl: `${getEnv().NEXT_PUBLIC_SITE_URL}/assets/logo-small.png`,
				name,
			}),
			subject: "Confirmation: You've Joined the GrantFlow Waitlist",
			to: email,
		});

		if (error) {
			return new Error(`Failed to send confirmation email: ${error.message}`);
		}

		return null;
	} catch (error) {
		return error as Error;
	}
}
