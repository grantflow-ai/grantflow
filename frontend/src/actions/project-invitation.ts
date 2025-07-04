"use server";

import { Resend } from "resend";
import { getEnv } from "@/utils/env";

const resend = new Resend(getEnv().RESEND_API_KEY);

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
		// For now, just send a simple email notification
		const { error } = await resend.emails.send({
			from: "noreply@grantflow.ai",
			html: `
				<div>
					<h2>You've been invited to collaborate!</h2>
					<p>${inviterName} has invited you to collaborate on the research project "${projectName}" as a ${role}.</p>
					<p>Visit <a href="https://app.grantflow.ai">GrantFlow</a> to get started.</p>
				</div>
			`,
			subject: `Invitation to collaborate on ${projectName}`,
			to: [email],
		});

		if (error) {
			return {
				error: error.message,
				success: false,
			};
		}

		return {
			invitationId: `temp-invitation-${projectId}-${Date.now()}`,
			success: true,
		};
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : "Failed to send invitation",
			success: false,
		};
	}
}
