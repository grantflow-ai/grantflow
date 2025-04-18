"use server";

import { Resend } from "resend";
import { waitlistSchema } from "./waitlist-validation-schema";
import { z } from "zod";
import { logError } from "@/utils/logging";
import { getWaitlistEmailTemplateHtml, waitlistEmailTemplateText } from "@/components/waitlist-email-template";
import { getEnv } from "@/utils/env";

export type ServerResponseCode =
	| "ALREADY_REGISTERED"
	| "EMAIL_SENDING_FAILED"
	| "RATE_LIMITED"
	| "SECURITY_CONCERN"
	| "SERVER_ERROR"
	| "SUCCESS"
	| "VALIDATION_ERROR";

const resend = new Resend(getEnv().NEXT_PUBLIC_RESEND_API_KEY_FULL_ACCESS);

export async function addToWaitlist(formData: z.infer<typeof waitlistSchema>): Promise<{
	code: ServerResponseCode;
	errors?: { email?: string[]; name?: string[] } | null;
	message?: string;
	success: boolean;
}> {
	const validationResult = waitlistSchema.safeParse(formData);

	if (!validationResult.success) {
		return {
			code: "VALIDATION_ERROR",
			errors: validationResult.error.flatten().fieldErrors,
			success: false,
		};
	}

	try {
		let audienceId;
		try {
			const { data, error } = await resend.audiences.list();
			if (error) {
				logError({
					error: "the audience could not be fetched",
					identifier: "waitlist-signup-unknown-error",
				});
			} else if (data && data.data.length > 0) {
				audienceId = data.data[0].id;
			}
		} catch {
			logError({
				error: "the contact could not be added to the audience",
				identifier: "waitlist-signup-unknown-error",
			});
		}

		if (audienceId) {
			try {
				const { error } = await resend.contacts.create({
					audienceId,
					email: formData.email,
					firstName: formData.name.split(" ")[0],
					lastName: formData.name.split(" ").slice(1).join(" "),
					unsubscribed: true,
				});
				if (error) {
					logError({
						error: `the contact could not be added to the audience: ${error.message}`,
						identifier: "waitlist-signup-unknown-error",
					});
				}
			} catch {
				logError({
					error: "the contact could not be added to the audience",
					identifier: "waitlist-signup-unknown-error",
				});
			}
		}

		const { error } = await resend.emails.send({
			from: "Na'aman from GrantFlow.ai <onboarding@resend.dev>",
			html: getWaitlistEmailTemplateHtml(formData.name),
			subject: "Confirmation: You’ve Joined the GrantFlow Waitlist",
			text: waitlistEmailTemplateText(formData.name),
			to: formData.email,
		});

		if (error) {
			const errorCode: ServerResponseCode =
				error.name === "rate_limit_exceeded" ? "RATE_LIMITED" : "SERVER_ERROR";

			return {
				code: errorCode,
				success: false,
			};
		}

		return {
			code: "SUCCESS",
			success: true,
		};
	} catch {
		logError({
			error: "An unknown error occurred",
			identifier: "waitlist-signup-unknown-error",
		});

		return {
			code: "SERVER_ERROR",
			success: false,
		};
	}
}
