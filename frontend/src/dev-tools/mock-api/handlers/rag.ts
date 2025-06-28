import { RagJobResponseFactory } from "::testing/factories";
import type { API } from "@/types/api-types";

export const ragHandlers = {
	crawlUrl: async ({
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

		console.log("[Mock API] Crawling URL for application:", applicationId, requestBody.url);
		return { source_id: crypto.randomUUID() };
	},
	getRagJob: async ({
		params,
	}: {
		params?: Record<string, string>;
	}): Promise<API.RetrieveRagJob.Http200.ResponseBody> => {
		const jobId = params?.job_id;
		if (!jobId) {
			throw new Error("Job ID required");
		}

		console.log("[Mock API] Getting RAG job:", jobId);
		return RagJobResponseFactory.build({
			completed_at: new Date().toISOString(),
			id: jobId,
			status: "COMPLETED",
		});
	},

	updateGrantTemplate: async ({
		params,
	}: {
		body?: any;
		params?: Record<string, string>;
	}): Promise<API.UpdateGrantTemplate.Http200.ResponseBody> => {
		const templateId = params?.template_id;
		if (!templateId) {
			throw new Error("Template ID required");
		}

		console.log("[Mock API] Updating grant template:", templateId);
		return undefined;
	},
};