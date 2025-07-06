"use server";

import { Resend } from "resend";
import { createInvitation } from "@/actions/project";
import { InvitationEmailTemplate } from "@/components/email-templates/invitation-email-template";
import { getEnv } from "@/utils/env";

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
		// Initialize Resend client
		const resend = new Resend(getEnv().RESEND_API_KEY);

		// First create the invitation in our backend
		const backendRole = role === "admin" ? "ADMIN" : "MEMBER";
		const invitationResult = await createInvitation(projectId, {
			email,
			role: backendRole,
		});

		// Generate the invitation URL with the JWT token
		const baseUrl = getEnv().NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
		const acceptInvitationUrl = `${baseUrl}/accept-invitation?token=${invitationResult.token}`;

		// Send email using the proper template
		const { error } = await resend.emails.send({
			from: "noreply@grantflow.ai",
			react: InvitationEmailTemplate({
				acceptInvitationUrl,
				inviterName,
				projectName,
				role,
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

		// Extract invitation ID from JWT token
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
