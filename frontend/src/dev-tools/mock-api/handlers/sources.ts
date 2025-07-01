import type { API } from "@/types/api-types";

export const sourceHandlers = {
	crawlApplicationUrl: async ({
		body,
		params,
	}: {
		body?: any;
		params?: Record<string, string>;
	}): Promise<API.CrawlGrantApplicationUrl.Http201.ResponseBody> => {
		const requestBody = body as API.CrawlGrantApplicationUrl.RequestBody;
		const applicationId = params?.application_id;

		if (!applicationId) {
			throw new Error("Application ID required");
		}
		if (!requestBody?.url) {
			throw new Error("URL required");
		}

		console.log("[Mock API] Crawling application URL:", applicationId, requestBody.url);
		return { source_id: crypto.randomUUID() };
	},

	crawlTemplateUrl: async ({
		body,
		params,
	}: {
		body?: any;
		params?: Record<string, string>;
	}): Promise<API.CrawlGrantTemplateUrl.Http201.ResponseBody> => {
		const requestBody = body as API.CrawlGrantTemplateUrl.RequestBody;
		const templateId = params?.template_id;

		if (!templateId) {
			throw new Error("Template ID required");
		}
		if (!requestBody?.url) {
			throw new Error("URL required");
		}

		console.log("[Mock API] Crawling template URL:", templateId, requestBody.url);
		return { source_id: crypto.randomUUID() };
	},

	createApplicationSourceUploadUrl: async ({
		params,
		query,
	}: {
		params?: Record<string, string>;
		query?: URLSearchParams;
	}): Promise<API.CreateGrantApplicationRagSourceUploadUrl.Http201.ResponseBody> => {
		const applicationId = params?.application_id;
		const fileName = query?.get("blob_name");

		if (!applicationId) {
			throw new Error("Application ID required");
		}
		if (!fileName) {
			throw new Error("File name required");
		}

		console.log("[Mock API] Creating application source upload URL:", applicationId, fileName);
		return {
			source_id: crypto.randomUUID(),
			url: `https://mock-storage.example.com/applications/${applicationId}/${crypto.randomUUID()}`,
		};
	},

	createTemplateSourceUploadUrl: async ({
		params,
		query,
	}: {
		params?: Record<string, string>;
		query?: URLSearchParams;
	}): Promise<API.CreateGrantTemplateRagSourceUploadUrl.Http201.ResponseBody> => {
		const templateId = params?.template_id;
		const fileName = query?.get("blob_name");

		if (!templateId) {
			throw new Error("Template ID required");
		}
		if (!fileName) {
			throw new Error("File name required");
		}

		console.log("[Mock API] Creating template source upload URL:", templateId, fileName);
		return {
			source_id: crypto.randomUUID(),
			url: `https://mock-storage.example.com/templates/${templateId}/${crypto.randomUUID()}`,
		};
	},

	deleteApplicationSource: async ({ params }: { params?: Record<string, string> }): Promise<void> => {
		const applicationId = params?.application_id;
		const sourceId = params?.source_id;

		if (!applicationId) {
			throw new Error("Application ID required");
		}
		if (!sourceId) {
			throw new Error("Source ID required");
		}

		console.log("[Mock API] Deleting application source:", applicationId, sourceId);
	},

	deleteTemplateSource: async ({ params }: { params?: Record<string, string> }): Promise<void> => {
		const templateId = params?.template_id;
		const sourceId = params?.source_id;

		if (!templateId) {
			throw new Error("Template ID required");
		}
		if (!sourceId) {
			throw new Error("Source ID required");
		}

		console.log("[Mock API] Deleting template source:", templateId, sourceId);
	},
};
