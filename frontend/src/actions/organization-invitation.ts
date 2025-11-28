"use server";

import { Resend } from "resend";
import { createOrganizationInvitation } from "@/actions/organization";
import InvitationEmailTemplate from "@/components/email-templates/invitation-email-template";
import { getEnv } from "@/utils/env";

interface InviteOrganizationMemberParams {
	email: string;
	hasAllProjectsAccess?: boolean;
	inviterName: string;
	organizationId: string;
	organizationName: string;
	projectIds?: string[];
	role: "admin" | "member";
}

export async function inviteOrganizationMember({
	email,
	hasAllProjectsAccess,
	inviterName,
	organizationId,
	organizationName,
	projectIds,
	role,
}: InviteOrganizationMemberParams): Promise<{
	error?: string;
	invitationId?: string;
	success: boolean;
}> {
	try {
		const resend = new Resend(getEnv().RESEND_API_KEY);

		const backendRole = role === "admin" ? "ADMIN" : "COLLABORATOR";

		const requestBody: {
			email: string;
			has_all_projects_access?: boolean;
			project_ids?: string[];
			role: "ADMIN" | "COLLABORATOR";
		} = {
			email,
			role: backendRole,
		};

		if (hasAllProjectsAccess !== undefined) {
			requestBody.has_all_projects_access = hasAllProjectsAccess;
		}

		if (projectIds !== undefined && projectIds.length > 0) {
			requestBody.project_ids = projectIds;
		}

		const invitationResult = await createOrganizationInvitation(organizationId, requestBody);

		const baseUrl = getEnv().NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
		const { token } = invitationResult;
		if (!token) {
			return {
				error: "Missing invitation token",
				success: false,
			};
		}

		const acceptInvitationUrl = `${baseUrl}/accept-invitation?token=${token}`;

		const emailSubject = organizationName
			? `Invitation to join ${organizationName}`
			: "Invitation to join an organization";

		const { error } = await resend.emails.send({
			from: "noreply@grantflow.ai",
			react: InvitationEmailTemplate({
				acceptInvitationUrl,
				inviterName,
				organizationName,
			}),
			subject: emailSubject,
			to: [email],
		});

		if (error) {
			return {
				error: error.message,
				success: false,
			};
		}

		const tokenParts = token.split(".");
		const [, tokenPayload] = tokenParts;
		if (!tokenPayload) {
			return {
				error: "Invalid token format",
				success: false,
			};
		}

		const payload = JSON.parse(atob(tokenPayload)) as {
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
