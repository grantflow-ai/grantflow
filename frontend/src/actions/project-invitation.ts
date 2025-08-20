"use server";

import { Resend } from "resend";
import { createInvitation } from "@/actions/project";
import InvitationEmailTemplate from "@/components/email-templates/invitation-email-template";
import { getEnv } from "@/utils/env";

interface InviteCollaboratorParams {
	email: string;
	inviterName: string;
	organizationId: string;
	projectId: string;
	projectName: string;
	role: "admin" | "member";
}

export async function inviteCollaborator({
	email,
	inviterName,
	organizationId,
	projectId,
	projectName,
	role,
}: InviteCollaboratorParams): Promise<{
	error?: string;
	invitationId?: string;
	success: boolean;
}> {
	try {
		const resend = new Resend(getEnv().RESEND_API_KEY);

		const backendRole = role === "admin" ? "ADMIN" : "COLLABORATOR";
		const invitationResult = await createInvitation(organizationId, projectId, {
			email,
			role: backendRole,
		});

		const baseUrl = getEnv().NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
		const acceptInvitationUrl = `${baseUrl}/accept-invitation?token=${invitationResult.token}`;

		const { error } = await resend.emails.send({
			from: "noreply@grantflow.ai",
			react: InvitationEmailTemplate({
				acceptInvitationUrl,
				inviterName,
				projectName,
			}),
			subject: `Invitation to collaborate on ${projectName}`,
			to: [email],
		});

		if (error) {
			return {
				error: error.message,
				success: false,
			};
		}

		const payload = JSON.parse(atob(invitationResult.token.split(".")[1])) as {
			invitation_id: string;
		};

		return {
			invitationId: payload.invitation_id,
			success: true,
		};
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : "Failed to send invitation",
			success: false,
		};
	}
}
