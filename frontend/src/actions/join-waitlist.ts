"use server";

import { logError } from "@/utils/logging";
import { getWaitlistEmailTemplateHtml, waitlistEmailTemplateText } from "@/components/waitlist-email-template";
import { getEnv } from "@/utils/env";
import Mailgun from "mailgun.js";

import { z } from "zod";

const DOMAIN = "grantflow.ai";
const WAITING_LIST_NAME = "waiting-list";

export const waitlistSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	name: z.string().min(2, "Name must be at least 2 characters long"),
});

const mailgun = new Mailgun(FormData);
const client = mailgun.client({ key: getEnv().NEXT_PUBLIC_MAILGUN_API_KEY, username: "api" });

export enum RESPONSE_CODES {
	SERVER_ERROR = "SERVER_ERROR",
	SUCCESS = "SUCCESS",
	VALIDATION_ERROR = "VALIDATION_ERROR",
}

export async function addToWaitlist(formData: z.infer<typeof waitlistSchema>): Promise<{
	code: RESPONSE_CODES;
	errors?: { email?: string[]; name?: string[] } | null;
	message?: string;
}> {
	const validationResult = waitlistSchema.safeParse(formData);

	if (!validationResult.success) {
		logError({
			error: `Validation failed: ${JSON.stringify(validationResult.error.flatten().fieldErrors)}`,
			identifier: "addToWaitlist",
		});

		return {
			code: RESPONSE_CODES.VALIDATION_ERROR,
			errors: validationResult.error.flatten().fieldErrors,
		};
	}

	const getOrCreateMailingListError = await getOrCreateMailingList();
	if (getOrCreateMailingListError) {
		logError({
			error: `Failed to get or create mailing list: ${getOrCreateMailingListError.message}`,
			identifier: "addToWaitlist",
		});

		return {
			code: RESPONSE_CODES.SERVER_ERROR,
		};
	}

	const addToWaitingListError = await addUserToMailingList(formData);

	if (addToWaitingListError) {
		logError({
			error: `Failed to add user to mailing list: ${addToWaitingListError.message}`,
			identifier: "addToWaitlist",
		});

		return {
			code: RESPONSE_CODES.SERVER_ERROR,
		};
	}

	const emailDeliveryError = await sendConfirmationEmail(formData);

	if (emailDeliveryError) {
		logError({
			error: `Failed to send confirmation email: ${emailDeliveryError.message}`,
			identifier: "addToWaitlist",
		});

		return {
			code: RESPONSE_CODES.SERVER_ERROR,
		};
	}

	return {
		code: RESPONSE_CODES.SUCCESS,
	};
}

async function addUserToMailingList({ email, name }: { email: string; name: string }): Promise<Error | null> {
	try {
		await client.lists.members.createMember(WAITING_LIST_NAME, {
			address: email,
			name,
			subscribed: true,
			upsert: "yes",
			vars: JSON.stringify({ name }),
		});
		return null;
	} catch (error) {
		return error as Error;
	}
}

async function getOrCreateMailingList(): Promise<Error | null> {
	try {
		const lists = await client.lists.list();

		if (lists.items.some((list) => list.name === WAITING_LIST_NAME)) {
			return null;
		}

		await client.lists.create({
			address: WAITING_LIST_NAME,
			description: "GrantFlow.ai Waiting List",
			name: WAITING_LIST_NAME,
		});

		return null;
	} catch (error) {
		return error as Error;
	}
}

async function sendConfirmationEmail({ email, name }: { email: string; name: string }): Promise<Error | null> {
	try {
		const response = await client.messages.create(DOMAIN, {
			from: "noreply@grantflow.ai",
			html: getWaitlistEmailTemplateHtml(name),
			subject: "Confirmation: You've Joined the GrantFlow Waitlist",
			text: waitlistEmailTemplateText(name),
			to: email,
		});

		if (response.status >= 400) {
			return new Error(
				`Failed to send confirmation email: ${response.status} - ${response.message} - ${response.details}`,
			);
		}

		return null;
	} catch (error) {
		return error as Error;
	}
}
