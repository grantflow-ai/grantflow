import { assertIsNotNullish } from "@tool-belt/type-predicates";
import { deepmerge } from "deepmerge-ts";
import ky, { HTTPError } from "ky";
import { toast } from "sonner";
import { create } from "zustand";
import {
	createApplication as handleCreateApplication,
	generateApplication as handleGenerateApplication,
	retrieveApplication as handleRetrieveApplication,
	updateApplication as handleUpdateApplication,
} from "@/actions/grant-applications";
import { generateGrantTemplate, updateGrantTemplate } from "@/actions/grant-template";
import { retrieveRagJob } from "@/actions/rag-jobs";
import {
	crawlApplicationUrl,
	crawlTemplateUrl,
	createApplicationSourceUploadUrl,
	createTemplateSourceUploadUrl,
	deleteApplicationSource,
	deleteTemplateSource,
} from "@/actions/sources";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { triggerMockWebSocketScenario } from "@/dev-tools/utils/dev-helpers";
import { useProjectStore } from "@/stores/project-store";
import type { API } from "@/types/api-types";
import type { FileWithId } from "@/types/files";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";
import { withRetry } from "@/utils/retry";
import { extractGrantTemplateValidationError } from "@/utils/validation";

export type ApplicationType = API.RetrieveApplication.Http200.ResponseBody | null;

const formatRagSources = (application: ApplicationType): string => {
	if (!application?.grant_template?.rag_sources) {
		return "files: [], urls: []";
	}

	const ragSources = application.grant_template.rag_sources;
	const files = ragSources
		.filter((source) => source.filename)
		.map((source) => `${source.filename}:${source.status}`)
		.join(", ");

	const urls = ragSources
		.filter((source) => source.url)
		.map((source) => `${source.url}:${source.status}`)
		.join(", ");

	return `files: [${files}], urls: [${urls}]`;
};

interface ApplicationState {
	application: ApplicationType;
	areAppOperationsInProgress: boolean;
	ragJobState: {
		isRestoring: boolean;
		restoredJob: API.RetrieveRagJob.Http200.ResponseBody | null;
	};
}

function handleRagJobDataResponse(
	jobData: API.RetrieveRagJob.Http200.ResponseBody,
	_ragJobId: string,
	set: (state: (state: ApplicationActions & ApplicationState) => ApplicationActions & ApplicationState) => void,
): void {
	const shouldRestore = jobData.status === "PROCESSING" || jobData.status === "PENDING";

	if (shouldRestore) {
		set((state) => ({
			...state,
			ragJobState: {
				isRestoring: false,
				restoredJob: jobData,
			},
		}));

		const progressText =
			jobData.current_stage && jobData.total_stages
				? `Stage ${jobData.current_stage} of ${jobData.total_stages}`
				: "In progress";

		toast.info(`🔄 Restored progress: ${progressText}`, {
			description: "Continuing from where you left off...",
			duration: 4000,
		});
	} else {
		set((state) => ({
			...state,
			ragJobState: {
				isRestoring: false,
				restoredJob: null,
			},
		}));
	}
}

function validateJobRestoration(application: ApplicationType): {
	isValid: boolean;
	projectId?: string;
	ragJobId?: string;
} {
	if (!application) {
		return { isValid: false };
	}

	const ragJobId = application.rag_job_id ?? application.grant_template?.rag_job_id;

	if (!ragJobId) {
		return { isValid: false };
	}

	if (!application.project_id) {
		log.error("checkAndRestoreJobState: No project_id in application context");
		return { isValid: false };
	}

	const { project } = useProjectStore.getState();
	if (project?.id && project.id !== application.project_id) {
		log.warn("application-store: validateJobRestoration: Project ID mismatch detected", {
			applicationProjectId: application.project_id,
			currentProjectId: project.id,
			ragJobId,
		});
		return { isValid: false };
	}

	return { isValid: true, projectId: application.project_id, ragJobId };
}

const initialState: ApplicationState = {
	application: null,
	areAppOperationsInProgress: false,
	ragJobState: {
		isRestoring: false,
		restoredJob: null,
	},
};

const validateStateForRagSource = (application: ApplicationType, parentId: string, actionName: string): boolean => {
	if (!application) {
		return false;
	}

	const isApplicationParent = parentId === application.id;
	const isTemplateParent = parentId === application.grant_template?.id;

	if (!(isApplicationParent || isTemplateParent)) {
		log.error(actionName, new Error(`Invalid parentId: ${parentId}. Must be application.id or grant_template.id`));
		return false;
	}

	return !(isTemplateParent && !application.grant_template);
};

const handleGrantTemplateValidationError = async (httpError: HTTPError): Promise<void> => {
	const errorMessage = await extractGrantTemplateValidationError(httpError);

	if (!errorMessage) {
		toast.error("Cannot generate grant template", {
			description: "Please ensure you have added a title and at least one document source.",
		});
		return;
	}

	if (errorMessage.includes("Grant template not found")) {
		toast.error("Grant template not found", {
			description: "The grant template could not be located. Please refresh and try again.",
		});
	} else if (errorMessage.includes("No rag sources found")) {
		toast.error("No documents available for generation", {
			description: "Add at least one document or URL to the knowledge base before generating the grant template.",
		});
	} else {
		toast.error("Cannot generate grant template", {
			description: "Please ensure you have added a title and at least one document source.",
		});
	}
};

interface ApplicationActions {
	addFile: (file: FileWithId, parentId: string) => Promise<void>;
	addUrl: (url: string, parentId: string) => Promise<void>;
	checkAndRestoreJobState: () => Promise<void>;
	clearRestoredJobState: () => void;
	createApplication: (projectId: string) => Promise<void>;
	generateApplication: (projectId: string, applicationId: string) => Promise<void>;
	generateTemplate: (templateId: string) => Promise<void>;
	removeFile: (file: FileWithId, parentId: string) => Promise<void>;
	removeUrl: (url: string, parentId: string) => Promise<void>;
	reset: () => void;
	retrieveApplication: (projectId: string, applicationId: string) => Promise<void>;
	setApplication: (application: NonNullable<ApplicationType>) => void;
	updateApplication: (data: Partial<API.UpdateApplication.RequestBody>) => Promise<void>;
	updateApplicationTitle: (projectId: string, applicationId: string, title: string) => Promise<void>;
	updateGrantSections: (sections: API.UpdateGrantTemplate.RequestBody["grant_sections"]) => Promise<void>;
}

const uploadFileInDevelopment = async (
	file: FileWithId,
	application: NonNullable<ApplicationType>,
	parentId: string,
	isApplicationParent: boolean,
) => {
	const createUploadUrl = isApplicationParent ? createApplicationSourceUploadUrl : createTemplateSourceUploadUrl;
	const { url } = await createUploadUrl(application.project_id, parentId, file.name);

	const { extractObjectPathFromUrl } = await import("@/utils/dev-indexing-patch");
	const objectPath = extractObjectPathFromUrl(url);

	if (!objectPath) {
		throw new Error("Failed to extract object path from upload URL");
	}

	const env = getEnv();

	if (env.NEXT_PUBLIC_GCS_EMULATOR_URL) {
		const emulatorUrl = `${env.NEXT_PUBLIC_GCS_EMULATOR_URL}/upload/storage/v1/b/grantflow-uploads/o?uploadType=media&name=${objectPath}`;

		await ky(emulatorUrl, {
			body: file,
			headers: {
				"Content-Type": file.type,
			},
			method: "POST",
		});
	}

	const { triggerDevIndexing } = await import("@/utils/dev-indexing-patch");

	setTimeout(() => {
		void triggerDevIndexing(objectPath);
	}, 500);
};

const uploadFileInProduction = async (
	file: FileWithId,
	application: NonNullable<ApplicationType>,
	parentId: string,
	isApplicationParent: boolean,
) => {
	const createUploadUrl = isApplicationParent ? createApplicationSourceUploadUrl : createTemplateSourceUploadUrl;
	const { url } = await createUploadUrl(application.project_id, parentId, file.name);

	await ky(url, {
		body: file,
		headers: {
			"Content-Type": file.type,
		},
		method: "PUT",
	});

	const { extractObjectPathFromUrl, triggerDevIndexing } = await import("@/utils/dev-indexing-patch");
	const objectPath = extractObjectPathFromUrl(url);
	if (objectPath) {
		void triggerDevIndexing(objectPath);
	}
};

export const useApplicationStore = create<ApplicationActions & ApplicationState>((set, get) => ({
	...initialState,

	addFile: async (file: FileWithId, parentId: string) => {
		const { application } = get();

		if (!validateStateForRagSource(application, parentId, "addFile")) {
			return;
		}

		const isApplicationParent = parentId === application!.id;

		try {
			await (process.env.NODE_ENV === "development"
				? uploadFileInDevelopment(file, application!, parentId, isApplicationParent)
				: uploadFileInProduction(file, application!, parentId, isApplicationParent));
			toast.success(`File ${file.name} uploaded successfully`);
		} catch (error) {
			log.error("addFile", error);
			toast.error("Failed to upload file. Please try again.");
		}

		log.info("[rag_sources_check] File upload completed, triggering retrieveApplication", {
			beforeRagSources: formatRagSources(application),
			fileName: file.name,
			isApplicationParent,
			parentId,
		});

		await get().retrieveApplication(application!.project_id, application!.id);
	},

	addUrl: async (url: string, parentId: string) => {
		const { application } = get();

		if (!validateStateForRagSource(application, parentId, "addUrl")) {
			return;
		}

		const isApplicationParent = parentId === application!.id;

		try {
			const crawlUrl = isApplicationParent ? crawlApplicationUrl : crawlTemplateUrl;
			await crawlUrl(application!.project_id, parentId, url);
			toast.success("URL added successfully");
			log.info("[rag_sources_check] URL crawl completed, triggering retrieveApplication", {
				beforeRagSources: formatRagSources(application),
				isApplicationParent,
				parentId,
				url,
			});
			await get().retrieveApplication(application!.project_id, application!.id);
		} catch (error) {
			log.error("addUrl", error);
			toast.error("Failed to process URL. Please try again.");
		}
	},

	checkAndRestoreJobState: async () => {
		const { application } = get();
		const validationResult = validateJobRestoration(application);

		if (!validationResult.isValid) {
			return;
		}

		const { projectId, ragJobId } = validationResult;

		assertIsNotNullish(projectId, {
			message: "projectId should be defined when validation passes",
		});
		assertIsNotNullish(ragJobId, {
			message: "ragJobId should be defined when validation passes",
		});

		log.info("checkAndRestoreJobState: Attempting RAG job restoration", {
			applicationId: application?.id,
			projectId,
			ragJobId,
			timestamp: new Date().toISOString(),
		});

		set((state) => ({
			...state,
			ragJobState: {
				...state.ragJobState,
				isRestoring: true,
			},
		}));

		try {
			const jobData = await retrieveRagJob(projectId, ragJobId);
			handleRagJobDataResponse(jobData, ragJobId, set);
		} catch (error) {
			set((state) => ({
				...state,
				ragJobState: {
					isRestoring: false,
					restoredJob: null,
				},
			}));
			log.error("checkAndRestoreJobState: Failed to restore job state", error, {
				projectId,
				ragJobId,
			});
		}
	},

	clearRestoredJobState: () => {
		set((state) => ({
			...state,
			ragJobState: {
				...state.ragJobState,
				restoredJob: null,
			},
		}));
	},

	createApplication: async (projectId: string) => {
		set({ areAppOperationsInProgress: true });
		try {
			const response = await handleCreateApplication(projectId, { title: DEFAULT_APPLICATION_TITLE });
			log.info("[rag_sources_check] Application state updated via createApplication", {
				applicationId: response.id,
				projectId,
				ragSources: formatRagSources(response),
			});
			set({
				application: response,
				areAppOperationsInProgress: false,
			});
		} catch (e: unknown) {
			log.error("createApplication", e);
			toast.error("Failed to initialize application");
			set({ areAppOperationsInProgress: false });
		}
	},

	generateApplication: async (projectId: string, applicationId: string) => {
		try {
			await withRetry(() => handleGenerateApplication(projectId, applicationId), {
				initialDelay: 1000,
				maxRetries: 3,
				retryCondition: (error: unknown) => {
					if (error instanceof HTTPError) {
						const { status } = error.response;
						return status >= 500;
					}
					return true;
				},
			});

			log.info("Grant application generation initiated", {
				application_id: applicationId,
				project_id: projectId,
			});
		} catch (error: unknown) {
			log.error("generateApplication", error);
			toast.error("Failed to generate grant application", {
				description: "An unexpected error occurred. Please try again.",
			});
		}
	},

	generateTemplate: async (templateId: string) => {
		const { application } = get();

		assertIsNotNullish(application, {
			message: "Application should not be null when calling generateTemplate",
		});

		try {
			log.info("About to call generateGrantTemplate", {
				applicationId: application.id,
				projectId: application.project_id,
				templateId,
			});

			const traceId = await withRetry(
				() => generateGrantTemplate(application.project_id, application.id, templateId),
				{
					initialDelay: 1000,
					maxRetries: 3,
					retryCondition: (error: unknown) => {
						if (error instanceof HTTPError) {
							const { status } = error.response;

							return status >= 500;
						}
						return true;
					},
				},
			);

			log.info("Grant template generation initiated", {
				application_id: application.id,
				project_id: application.project_id,
				template_id: templateId,
				trace_id: traceId,
			});

			await triggerMockWebSocketScenario(application.id, "grant-template-generation");
		} catch (error: unknown) {
			if (error instanceof HTTPError && error.response.status === 422) {
				await handleGrantTemplateValidationError(error);
				return;
			}
			toast.error("Failed to generate grant template", {
				description: "An unexpected error occurred. Please try again.",
			});
		}
	},

	removeFile: async (fileToRemove: FileWithId, parentId: string) => {
		const { application } = get();

		if (!validateStateForRagSource(application, parentId, "removeFile")) {
			return;
		}

		if (!fileToRemove.id) {
			toast.error("Cannot remove file: File ID not found");
			return;
		}

		const isApplicationParent = parentId === application!.id;

		try {
			const deleteSource = isApplicationParent ? deleteApplicationSource : deleteTemplateSource;
			await deleteSource(application!.project_id, parentId, fileToRemove.id);
			toast.success(`File ${fileToRemove.name} removed`);
			log.info("[rag_sources_check] File removal completed, triggering retrieveApplication", {
				beforeRagSources: formatRagSources(application),
				fileId: fileToRemove.id,
				fileName: fileToRemove.name,
				isApplicationParent,
				parentId,
			});
			await get().retrieveApplication(application!.project_id, application!.id);
		} catch (error) {
			log.error("removeFile", error);
			toast.error("Failed to remove file. Please try again.");
		}
	},

	removeUrl: async (urlToRemove: string, parentId: string) => {
		const { application } = get();

		if (!validateStateForRagSource(application, parentId, "removeUrl")) {
			return;
		}

		const isApplicationParent = parentId === application!.id;

		const ragSources = isApplicationParent
			? application!.rag_sources
			: (application!.grant_template?.rag_sources ?? []);

		log.info("[removeUrl] Debug info", {
			isApplicationParent,
			parentId,
			ragSources: ragSources.map((source) => ({
				filename: source.filename,
				hasUrl: !!source.url,
				sourceId: source.sourceId,
				url: source.url,
				urlMatch: source.url === urlToRemove,
			})),
			ragSourcesCount: ragSources.length,
			urlToRemove,
		});

		const ragSource = ragSources.find((source) => source.url === urlToRemove);

		if (!ragSource) {
			log.error("[removeUrl] Source not found", {
				availableUrls: ragSources.filter((s) => s.url).map((s) => s.url),
				urlToRemove,
			});
			toast.error("Cannot remove URL: Source not found");
			return;
		}

		log.info("[removeUrl] Found source to delete", {
			sourceId: ragSource.sourceId,
			url: ragSource.url,
		});

		try {
			const deleteSource = isApplicationParent ? deleteApplicationSource : deleteTemplateSource;
			log.info("[removeUrl] About to call delete API", {
				deleteFunction: isApplicationParent ? "deleteApplicationSource" : "deleteTemplateSource",
				parentId,
				projectId: application!.project_id,
				sourceId: ragSource.sourceId,
			});

			await deleteSource(application!.project_id, parentId, ragSource.sourceId);

			log.info("[removeUrl] Delete API call succeeded");
			toast.success("URL removed successfully");
			log.info("[rag_sources_check] URL removal completed, triggering retrieveApplication", {
				beforeRagSources: formatRagSources(application),
				isApplicationParent,
				parentId,
				sourceId: ragSource.sourceId,
				url: urlToRemove,
			});

			await get().retrieveApplication(application!.project_id, application!.id);
			log.info("[removeUrl] retrieveApplication completed");
		} catch (error) {
			log.error("[removeUrl] Error occurred", error);
			toast.error("Failed to remove URL. Please try again.");
		}
	},

	reset: () => {
		const { application } = get();
		log.info("[rag_sources_check] Application state reset", {
			previousApplicationId: application?.id,
			previousProjectId: application?.project_id,
			previousRagSources: formatRagSources(application),
		});
		set(structuredClone(initialState));
	},

	retrieveApplication: async (projectId: string, applicationId: string) => {
		set({ areAppOperationsInProgress: true });
		try {
			const response = await handleRetrieveApplication(projectId, applicationId);
			log.info("[rag_sources_check] Application state updated via retrieveApplication", {
				applicationId,
				projectId,
				ragSources: formatRagSources(response),
			});
			set({
				application: response,
				areAppOperationsInProgress: false,
			});
		} catch (e: unknown) {
			log.error("retrieveApplication", e);
			toast.error("Failed to retrieve application");
			set({ areAppOperationsInProgress: false });
		}
	},

	setApplication: (application: NonNullable<ApplicationType>) => {
		log.info("[rag_sources_check] Application state updated via setApplication", {
			applicationId: application.id,
			projectId: application.project_id,
			ragSources: formatRagSources(application),
		});
		set({ application });
	},

	updateApplication: async (data: Partial<API.UpdateApplication.RequestBody>) => {
		const existingApplication = get().application;

		assertIsNotNullish(existingApplication, {
			message: "Application should not be null when calling updateApplication",
		});

		set({ areAppOperationsInProgress: true });

		const updatedApplication = deepmerge(existingApplication, data) as NonNullable<ApplicationType>;

		log.info("[rag_sources_check] Application state updated via updateApplication (optimistic)", {
			applicationId: updatedApplication.id,
			projectId: updatedApplication.project_id,
			ragSources: formatRagSources(updatedApplication),
		});
		set({ application: updatedApplication });

		try {
			const response = await handleUpdateApplication(
				existingApplication.project_id,
				existingApplication.id,
				data,
			);
			log.info("[rag_sources_check] Application state updated via updateApplication (API success)", {
				applicationId: response.id,
				projectId: response.project_id,
				ragSources: formatRagSources(response),
			});
			set({ application: response });
		} catch (e) {
			log.info("[rag_sources_check] Application state reverted via updateApplication (API failure)", {
				applicationId: existingApplication.id,
				projectId: existingApplication.project_id,
				ragSources: formatRagSources(existingApplication),
			});
			set({ application: existingApplication });
			log.error("updateApplication", new Error(`Failed to update application: ${e}`));
			toast.error("Failed to update application");
		} finally {
			set({ areAppOperationsInProgress: false });
		}
	},

	updateApplicationTitle: async (projectId: string, applicationId: string, title: string) => {
		const { application } = get();

		assertIsNotNullish(application, { message: "Application must exist to update title" });

		const originalTitle = application.title;

		try {
			const response = await handleUpdateApplication(projectId, applicationId, { title });
			log.info("[rag_sources_check] Application state updated via updateApplicationTitle", {
				applicationId: response.id,
				projectId: response.project_id,
				ragSources: formatRagSources(response),
				title: response.title,
			});
			set({ application: response });
		} catch (error) {
			const currentApplication = get().application;
			if (currentApplication) {
				const revertedApplication = {
					...currentApplication,
					title: originalTitle,
				};
				log.info("[rag_sources_check] Application state reverted via updateApplicationTitle (title restore)", {
					applicationId: revertedApplication.id,
					projectId: revertedApplication.project_id,
					ragSources: formatRagSources(revertedApplication),
					title: revertedApplication.title,
				});
				set({
					application: revertedApplication,
				});
			}
			log.error("updateApplicationTitle", error);
			toast.error("Failed to update application title");
		}
	},

	updateGrantSections: async (sections: API.UpdateGrantTemplate.RequestBody["grant_sections"]) => {
		const { application } = get();
		const previousGrantSections = application?.grant_template?.grant_sections;

		log.info("updateGrantSections: Starting", {
			hasApplication: !!application,
			hasGrantTemplate: !!application?.grant_template,
			sectionCount: sections.length,
			templateId: application?.grant_template?.id,
		});

		if (!application?.grant_template?.id) {
			log.warn("updateGrantSections: No grant template ID found");
			return;
		}

		const updatedApplication: NonNullable<ApplicationType> = {
			...application,
			grant_template: {
				...application.grant_template,
				grant_sections: sections,
			},
		};

		log.info("updateGrantSections: Optimistically updating state");
		log.info("[rag_sources_check] Application state updated via updateGrantSections (optimistic)", {
			applicationId: updatedApplication.id,
			projectId: updatedApplication.project_id,
			ragSources: formatRagSources(updatedApplication),
		});
		set({ application: updatedApplication });

		try {
			log.info("updateGrantSections: Calling API", {
				applicationId: application.id,
				projectId: application.project_id,
				sectionCount: sections.length,
				templateId: application.grant_template.id,
			});

			await updateGrantTemplate(application.project_id, application.id, application.grant_template.id, {
				grant_sections: sections,
			});

			log.info("updateGrantSections: Success");
		} catch (error) {
			const restoredApplication: NonNullable<ApplicationType> = {
				...application,
				grant_template: {
					...application.grant_template,
					grant_sections: previousGrantSections ?? [],
				},
			};
			log.info("[rag_sources_check] Application state reverted via updateGrantSections (API failure)", {
				applicationId: restoredApplication.id,
				projectId: restoredApplication.project_id,
				ragSources: formatRagSources(restoredApplication),
			});
			set({ application: restoredApplication });
			log.error("updateGrantSections: Failed", error);
			toast.error("Failed to update grant sections");
		}
	},
}));
