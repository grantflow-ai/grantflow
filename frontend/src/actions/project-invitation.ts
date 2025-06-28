"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

import Mailgun from "mailgun.js";
import {
	getInvitationEmailTemplateHtml,
	invitationEmailTemplateText,
} from "@/components/email-templates/invitation-email-template";
import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";
import { getEnv } from "@/utils/env";
import { logError } from "@/utils/logging";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

const DOMAIN = "grantflow.ai";
const mailgun = new Mailgun(FormData);
const client = mailgun.client({ key: getEnv().NEXT_PUBLIC_MAILGUN_API_KEY, username: "api" });

const getLogo = async (): Promise<{ data: Buffer; filename: string }> => {
	const logo = await readFile(path.resolve(process.cwd(), "public/assets/logo-small.png"));
	return {
		data: logo,
		filename: "logo.png",
	};
};

interface InviteCollaboratorParams {
	email: string;
	inviterName: string;
	projectId: string;
	projectName: string;
	role: "admin" | "member";
}

export async function inviteCollaborator({
	email,
	inviterName,
	projectId,
	projectName,
	role,
}: InviteCollaboratorParams): Promise<{
	error?: string;
	invitationId?: string;
	success: boolean;
}> {
	try {
		
		const response = await withAuthRedirect(
			getClient()
				.post(`projects/${projectId}/create-invitation-redirect-url`, {
					headers: await createAuthHeaders(),
					json: {
						email,
						role: role === "admin" ? "ADMIN" : "MEMBER",
					} as API.CreateInvitationRedirectUrl.RequestBody,
				})
				.json<API.CreateInvitationRedirectUrl.Http201.ResponseBody>(),
		);

		if (!response.token) {
			throw new Error("Failed to create invitation token");
		}

		
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.grantflow.ai";
		const invitationUrl = `${baseUrl}/invite?token=${response.token}`;

		
		const emailError = await sendInvitationEmail({
			email,
			invitationUrl,
			inviterName,
			projectName,
		});

		if (emailError) {
			logError({
				error: `Failed to send invitation email: ${emailError.message}`,
				identifier: "inviteCollaborator",
			});

			
			
			return {
				error: "Invitation created but email delivery failed. Please share the invitation link manually.",
				invitationId: invitationUrl,
				success: true,
			};
		}

		return {
			invitationId: invitationUrl,
			success: true,
		};
	} catch (error) {
		logError({
			error: error instanceof Error ? error.message : "Failed to invite collaborator",
			identifier: "inviteCollaborator",
		});

		return {
			error: error instanceof Error ? error.message : "Failed to invite collaborator",
			success: false,
		};
	}
}

async function sendInvitationEmail({
	email,
	invitationUrl,
	inviterName,
	projectName,
}: {
	email: string;
	invitationUrl: string;
	inviterName: string;
	projectName: string;
}): Promise<Error | null> {
	const logo = await getLogo();

	try {
		const response = await client.messages.create(DOMAIN, {
			from: "noreply@grantflow.ai",
			html: getInvitationEmailTemplateHtml(inviterName, projectName, invitationUrl),
			inline: [logo], 
			subject: "Invitation to Collaborate on a Research Project in GrantFlow",
			text: invitationEmailTemplateText(inviterName, projectName, invitationUrl),
			to: email,
		});

		if (response.status >= 400) {
			return new Error(
				`Failed to send invitation email: ${response.status} - ${response.message} - ${response.details}`,
			);
		}

		return null;
	} catch (error) {
		return error as Error;
	}
}
