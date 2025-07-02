import { RagSourceFactory } from "::testing/factories";
import type { API } from "@/types/api-types";
import { applicationStore } from "./applications";

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

		// Update application store with new URL source
		const application = applicationStore.get(applicationId);
		if (application) {
			const sourceId = crypto.randomUUID();
			const newSource = RagSourceFactory.build({
				sourceId,
				status: "CREATED",
				url: requestBody.url,
			});

			const updatedApplication = {
				...application,
				rag_sources: [...(application.rag_sources || []), newSource],
			};
			applicationStore.set(applicationId, updatedApplication);

			return { source_id: sourceId };
		}

		const sourceId = crypto.randomUUID();
		return { source_id: sourceId };
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

		// Find application with this template and update its grant_template.rag_sources
		const sourceId = crypto.randomUUID();
		const newSource = RagSourceFactory.build({
			sourceId,
			status: "CREATED",
			url: requestBody.url,
		});

		for (const [appId, application] of applicationStore.entries()) {
			if (application.grant_template?.id === templateId) {
				const updatedApplication = {
					...application,
					grant_template: {
						...application.grant_template,
						rag_sources: [...(application.grant_template.rag_sources || []), newSource],
					},
				};
				applicationStore.set(appId, updatedApplication);
				break;
			}
		}

		return { source_id: sourceId };
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

		// Create file source and add to application
		const application = applicationStore.get(applicationId);
		if (application) {
			const sourceId = crypto.randomUUID();
			const newSource = RagSourceFactory.build({
				filename: fileName,
				sourceId,
				status: "CREATED",
			});

			const updatedApplication = {
				...application,
				rag_sources: [...(application.rag_sources || []), newSource],
			};
			applicationStore.set(applicationId, updatedApplication);

			return {
				source_id: sourceId,
				url: `https://mock-storage.example.com/applications/${applicationId}/${sourceId}`,
			};
		}

		const sourceId = crypto.randomUUID();
		return {
			source_id: sourceId,
			url: `https://mock-storage.example.com/applications/${applicationId}/${sourceId}`,
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

		console.log("[Mock API] Template upload URL request:", {
			fileName,
			params,
			queryParams: query ? Object.fromEntries(query.entries()) : null,
			storeSize: applicationStore.size,
			templateId,
		});

		if (!templateId) {
			console.error("[Mock API] Template ID missing in params:", params);
			throw new Error("Template ID required");
		}
		if (!fileName) {
			console.error("[Mock API] File name missing in query:", query?.toString());
			throw new Error("File name required");
		}

		console.log("[Mock API] Creating template source upload URL:", templateId, fileName);

		const sourceId = crypto.randomUUID();
		const newSource = RagSourceFactory.build({
			filename: fileName,
			sourceId,
			status: "CREATED",
		});

		let foundApplication = false;
		const applications = [...applicationStore.entries()];
		console.log("[Mock API] Searching for template in applications:", {
			applications: applications.map(([id, app]) => ({
				id,
				templateId: app.grant_template?.id,
			})),
			applicationsCount: applications.length,
			templateId,
		});

		for (const [appId, application] of applicationStore.entries()) {
			if (application.grant_template?.id === templateId) {
				console.log("[Mock API] Found matching application for template:", appId);
				foundApplication = true;
				const updatedApplication = {
					...application,
					grant_template: {
						...application.grant_template,
						rag_sources: [...(application.grant_template.rag_sources || []), newSource],
					},
				};
				applicationStore.set(appId, updatedApplication);
				break;
			}
		}

		if (!foundApplication) {
			console.warn("[Mock API] No application found with template ID:", templateId);
		}

		return {
			source_id: sourceId,
			url: `https://mock-storage.example.com/templates/${templateId}/${sourceId}`,
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

		// Remove source from application
		const application = applicationStore.get(applicationId);
		if (application) {
			const updatedApplication = {
				...application,
				rag_sources: (application.rag_sources || []).filter((source) => source.sourceId !== sourceId),
			};
			applicationStore.set(applicationId, updatedApplication);
		}
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

		// Remove source from template
		for (const [appId, application] of applicationStore.entries()) {
			if (application.grant_template?.id === templateId) {
				const updatedApplication = {
					...application,
					grant_template: {
						...application.grant_template,
						rag_sources: (application.grant_template.rag_sources || []).filter(
							(source) => source.sourceId !== sourceId,
						),
					},
				};
				applicationStore.set(appId, updatedApplication);
				break;
			}
		}
	},
};
