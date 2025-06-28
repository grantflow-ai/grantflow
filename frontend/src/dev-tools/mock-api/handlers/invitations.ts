import { TokenResponseFactory } from "::testing/factories";
import type { API } from "@/types/api-types";

export const invitationHandlers = {
	acceptInvitation: async ({
		params,
	}: {
		params?: Record<string, string>;
	}): Promise<API.AcceptInvitation.Http200.ResponseBody> => {
		const invitationId = params?.invitation_id;
		if (!invitationId) {
			throw new Error("Invitation ID required");
		}

		console.log("[Mock API] Accepting invitation:", invitationId);
		return TokenResponseFactory.build();
	},
	createInvitation: async ({
		body,
		params,
	}: {
		body?: any;
		params?: Record<string, string>;
	}): Promise<API.CreateInvitationRedirectUrl.Http201.ResponseBody> => {
		const requestBody = body as API.CreateInvitationRedirectUrl.RequestBody;
		const projectId = params?.project_id;
		if (!projectId) {
			throw new Error("Project ID required");
		}

		console.log("[Mock API] Creating invitation for:", requestBody.email);
		return TokenResponseFactory.build();
	},

	updateInvitationRole: async ({
		body,
		params,
	}: {
		body?: any;
		params?: Record<string, string>;
	}): Promise<API.UpdateInvitationRole.Http200.ResponseBody> => {
		const requestBody = body as API.UpdateInvitationRole.RequestBody;
		const invitationId = params?.invitation_id;
		if (!invitationId) {
			throw new Error("Invitation ID required");
		}

		console.log("[Mock API] Updating invitation role:", invitationId, "to", requestBody.role);
		return TokenResponseFactory.build();
	},
};