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

		return TokenResponseFactory.build();
	},
	createInvitation: async ({
		params,
	}: {
		body?: any;
		params?: Record<string, string>;
	}): Promise<API.CreateInvitationRedirectUrl.Http201.ResponseBody> => {
		const projectId = params?.project_id;
		if (!projectId) {
			throw new Error("Project ID required");
		}

		return TokenResponseFactory.build();
	},

	updateInvitationRole: async ({
		params,
	}: {
		body?: any;
		params?: Record<string, string>;
	}): Promise<API.UpdateInvitationRole.Http200.ResponseBody> => {
		const invitationId = params?.invitation_id;
		if (!invitationId) {
			throw new Error("Invitation ID required");
		}

		return TokenResponseFactory.build();
	},
};
