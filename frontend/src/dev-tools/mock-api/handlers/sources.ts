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

		const application = applicationStore.get(applicationId);
		if (application) {
			const sourceId = crypto.randomUUID();
			const newSource = {
				sourceId,
				status: "CREATED" as const,
				url: requestBody.url,
			};

			const updatedApplication = {
				...application,
				rag_sources: [...(application.rag_sources || []), newSource],
			};
			applicationStore.set(applicationId, updatedApplication);

			setTimeout(() => {
				const currentApp = applicationStore.get(applicationId);
				if (currentApp) {
					const updatedSources = currentApp.rag_sources.map((source) =>
						source.sourceId === sourceId ? { ...source, status: "FINISHED" as const } : source,
					);
					applicationStore.set(applicationId, {
						...currentApp,
						rag_sources: updatedSources,
					});
				}
			}, 3000);

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

		const sourceId = crypto.randomUUID();
		const newSource = {
			sourceId,
			status: "CREATED" as const,
			url: requestBody.url,
		};

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

				setTimeout(() => {
					const currentApp = applicationStore.get(appId);
					if (currentApp?.grant_template) {
						const updatedSources = currentApp.grant_template.rag_sources.map((source) =>
							source.sourceId === sourceId ? { ...source, status: "FINISHED" as const } : source,
						);
						applicationStore.set(appId, {
							...currentApp,
							grant_template: {
								...currentApp.grant_template,
								rag_sources: updatedSources,
							},
						});
					}
				}, 3000);

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

		const application = applicationStore.get(applicationId);
		if (application) {
			const sourceId = crypto.randomUUID();
			const newSource = {
				filename: fileName,
				sourceId,
				status: "CREATED" as const,
			};

			const updatedApplication = {
				...application,
				rag_sources: [...(application.rag_sources || []), newSource],
			};
			applicationStore.set(applicationId, updatedApplication);

			return {
				source_id: sourceId,
				url: `https://mock-storage.example.com/upload/storage/v1/b/grantflow-uploads/o?uploadType=media&name=applications/${applicationId}/${fileName}`,
			};
		}

		const sourceId = crypto.randomUUID();
		return {
			source_id: sourceId,
			url: `https://mock-storage.example.com/upload/storage/v1/b/grantflow-uploads/o?uploadType=media&name=applications/${applicationId}/${fileName}`,
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
			throw new Error("Template ID required");
		}
		if (!fileName) {
			throw new Error("File name required");
		}

		const sourceId = crypto.randomUUID();
		const newSource = {
			filename: fileName,
			sourceId,
			status: "CREATED" as const,
		};

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
			url: `https://mock-storage.example.com/upload/storage/v1/b/grantflow-uploads/o?uploadType=media&name=templates/${templateId}/${fileName}`,
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
