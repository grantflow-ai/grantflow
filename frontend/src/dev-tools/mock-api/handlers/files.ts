import { IdResponseFactory } from "::testing/factories";

export const fileHandlers = {
	deleteFile: async ({ params }: { params?: Record<string, string> }): Promise<void> => {
		const sourceId = params?.source_id;
		if (!sourceId) {
			throw new Error("Source ID required");
		}
	},

	uploadFile: async ({ params }: { body?: any; params?: Record<string, string> }): Promise<any> => {
		const applicationId = params?.application_id;
		if (!applicationId) {
			throw new Error("Application ID required");
		}

		return IdResponseFactory.build();
	},
};
