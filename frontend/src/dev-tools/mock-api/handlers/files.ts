import { IdResponseFactory } from "::testing/factories";

export const fileHandlers = {
	deleteFile: async ({ params }: { params?: Record<string, string> }): Promise<void> => {
		const sourceId = params?.source_id;
		if (!sourceId) {
			throw new Error("Source ID required");
		}

		console.log("[Mock API] Deleting file:", sourceId);
	},

	uploadFile: async ({ params }: { body?: any; params?: Record<string, string> }): Promise<any> => {
		// File upload response - simplified for mock
		const applicationId = params?.application_id;
		if (!applicationId) {
			throw new Error("Application ID required");
		}

		console.log("[Mock API] Uploading file for application:", applicationId);
		return IdResponseFactory.build();
	},
};
