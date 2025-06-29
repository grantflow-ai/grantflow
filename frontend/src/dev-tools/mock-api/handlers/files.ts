import { IdResponseFactory } from "::testing/factories";
import type { API } from "@/types/api-types";

export const fileHandlers = {
	deleteFile: async ({ params }: { params?: Record<string, string> }): Promise<void> => {
		const sourceId = params?.source_id;
		if (!sourceId) {
			throw new Error("Source ID required");
		}

		console.log("[Mock API] Deleting file:", sourceId);
	},

	getUploadUrl: async ({
		params,
	}: {
		params?: Record<string, string>;
	}): Promise<API.CreateGrantApplicationRagSourceUploadUrl.Http201.ResponseBody> => {
		const applicationId = params?.application_id;
		if (!applicationId) {
			throw new Error("Application ID required");
		}

		console.log("[Mock API] Getting upload URL for application:", applicationId);
		return {
			source_id: crypto.randomUUID(),
			url: `https://mock-storage.example.com/upload/${crypto.randomUUID()}`,
		};
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
