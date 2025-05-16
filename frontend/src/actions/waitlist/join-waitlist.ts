"use server";

import { Resend } from "resend";
import { waitlistSchema } from "@/actions/waitlist/waitlist-validation-schema";
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
		logError({
			error: `Validation failed: ${JSON.stringify(validationResult.error.flatten().fieldErrors)}`,
			identifier: "addToWaitlist",
		});

		return {
			code: "VALIDATION_ERROR",
			errors: validationResult.error.flatten().fieldErrors,
			success: false,
		};
	}

	try {
		const audienceId = await getAudienceId();

		if (audienceId) {
			const { error } = await resend.contacts.create({
				audienceId,
				email: formData.email,
				firstName: formData.name.split(" ")[0],
				lastName: formData.name.split(" ").slice(1).join(" "),
				unsubscribed: false,
			});

			if (error) {
				logError({
					error: `the contact could not be added to the audience: ${error.message}`,
					identifier: "addToWaitlist",
				});
			}
		}

		const emailDeliveryResponse = await sendConfirmationEmail(formData);

		return {
			code: emailDeliveryResponse,
			success: emailDeliveryResponse === "SUCCESS",
		};
	} catch {
		logError({
			error: "An unknown error occurred",
			identifier: "addToWaitlist",
		});

		return {
			code: "SERVER_ERROR",
			success: false,
		};
	}
}

async function getAudienceId(): Promise<string | undefined> {
	const { data: responseData, error } = await resend.audiences.list();

	if (responseData) {
		const {
			data: [{ id }],
		} = responseData;
		return id;
	}

	logError({
		error: `the audience could not be fetched: ${error?.name ?? "unknown error"}: ${error?.message ?? "unknown error"}`,
		identifier: "getAudienceId",
	});

	return;
}

async function sendConfirmationEmail(formData: { email: string; name: string }): Promise<ServerResponseCode> {
	const { error } = await resend.emails.send({
		from:
			process.env.NODE_ENV === "production"
				? "noreply@grantflow.ai"
				: "Na'aman from GrantFlow.ai <onboarding@resend.dev>",
		html: getWaitlistEmailTemplateHtml(formData.name),
		subject: "Confirmation: You’ve Joined the GrantFlow Waitlist",
		text: waitlistEmailTemplateText(formData.name),
		to: formData.email,
	});

	if (error) {
		logError({
			error: `the email could not be sent: ${error.name}: ${error.message}`,
			identifier: "sendConfirmationEmail",
		});
	}

	return error ? (error.name === "rate_limit_exceeded" ? "RATE_LIMITED" : "SERVER_ERROR") : "SUCCESS";
}
