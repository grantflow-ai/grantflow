"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

import Mailgun from "mailgun.js";

import { getWaitlistEmailTemplateHtml, waitlistEmailTemplateText } from "@/components/waitlist-email-template";
import { WAITING_LIST_RESPONSE_CODES } from "@/enums";
import { getEnv } from "@/utils/env";
import { logError } from "@/utils/logging";

import type { waitlistSchema } from "@/schemas/waitlist-schema";
import type { z } from "zod";

const DOMAIN = "grantflow.ai";
const WAITING_LIST_NAME = `waiting-list@${DOMAIN}`;

const mailgun = new Mailgun(FormData);
const client = mailgun.client({ key: getEnv().NEXT_PUBLIC_MAILGUN_API_KEY, username: "api" });

const getLogo = async (): Promise<{ data: Buffer; filename: string }> => {
	const logo = await readFile(path.resolve(process.cwd(), "public/assets/logo-small.png"));
	return {
		data: logo,
		filename: "logo.png",
	};
};

export async function addToWaitlist(formData: z.infer<typeof waitlistSchema>): Promise<{
	code: WAITING_LIST_RESPONSE_CODES;
	error?: { email?: string[]; name?: string[] } | null;
	message?: string;
}> {
	const getOrCreateMailingListError = await getOrCreateMailingList();
	if (getOrCreateMailingListError) {
		logError({
			error: `Failed to get or create mailing list: ${getOrCreateMailingListError.message}`,
			identifier: "addToWaitlist",
		});

		return {
			code: WAITING_LIST_RESPONSE_CODES.SERVER_ERROR,
		};
	}

	const addToWaitingListError = await addUserToMailingList(formData);

	if (addToWaitingListError) {
		logError({
			error: `Failed to add user to mailing list: ${addToWaitingListError.message}`,
			identifier: "addToWaitlist",
		});

		return {
			code: WAITING_LIST_RESPONSE_CODES.SERVER_ERROR,
		};
	}

	const emailDeliveryError = await sendConfirmationEmail(formData);

	if (emailDeliveryError) {
		logError({
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

		if (lists.items.some((list) => list.name === WAITING_LIST_NAME.split("@")[0])) {
			return null;
		}

		await client.lists.create({
			address: WAITING_LIST_NAME,
			description: "GrantFlow.ai Waiting List",
			name: WAITING_LIST_NAME.split("@")[0],
		});

		return null;
	} catch (error) {
		return error as Error;
	}
}

async function sendConfirmationEmail({ email, name }: { email: string; name: string }): Promise<Error | null> {
	const logo = await getLogo();
	try {
		const response = await client.messages.create(DOMAIN, {
			from: "noreply@grantflow.ai",
			html: getWaitlistEmailTemplateHtml(name),
			inline: [logo], // logo is linked to the template by specifying src="cid:<filename>" in the HTML ~keep
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
