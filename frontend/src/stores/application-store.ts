import { assertIsNotNullish } from "@tool-belt/type-predicates";
import { deepmerge } from "deepmerge-ts";
import ky, { HTTPError } from "ky";
import { toast } from "sonner";
import { create } from "zustand";

import {
	createApplication as handleCreateApplication,
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
import type { API } from "@/types/api-types";
import type { FileWithId } from "@/types/files";
import { getEnv } from "@/utils/env";
import { logError, logTrace } from "@/utils/logging";
import { withRetry } from "@/utils/retry";
import { extractGrantTemplateValidationError } from "@/utils/validation";

export type ApplicationType = API.RetrieveApplication.Http200.ResponseBody | null;

export const DEFAULT_APPLICATION_TITLE = "Untitled Application";

interface ApplicationState {
	application: ApplicationType;
	areAppOperationsInProgress: boolean;
	ragJobState: {
		isRestoring: boolean;
		restoredJob: API.RetrieveRagJob.Http200.ResponseBody | null;
	};
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
		logError({
			error: `Invalid parentId: ${parentId}. Must be application.id or grant_template.id`,
			identifier: actionName,
		});
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
			await get().retrieveApplication(application!.project_id, application!.id);
		} catch (error) {
			logError({ error, identifier: "addFile" });
			toast.error("Failed to upload file. Please try again.");
		}
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
			await get().retrieveApplication(application!.project_id, application!.id);
		} catch (error) {
			logError({ error, identifier: "addUrl" });
			toast.error("Failed to process URL. Please try again.");
		}
	},

	checkAndRestoreJobState: async () => {
		const { application } = get();

		if (!application) {
			return;
		}

		const ragJobId = application.rag_job_id ?? application.grant_template?.rag_job_id;

		if (!ragJobId) {
			return;
		}

		set((state) => ({
			...state,
			ragJobState: {
				...state.ragJobState,
				isRestoring: true,
			},
		}));

		try {
			const jobData = await retrieveRagJob(application.project_id, ragJobId);

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
		} catch (error) {
			set((state) => ({
				...state,
				ragJobState: {
					isRestoring: false,
					restoredJob: null,
				},
			}));
			logError({ error, identifier: "checkAndRestoreJobState" });
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
			set({
				application: response,
				areAppOperationsInProgress: false,
			});
		} catch (e: unknown) {
			logError({ error: e, identifier: "createApplication" });
			toast.error("Failed to initialize application");
			set({ areAppOperationsInProgress: false });
		}
	},

	generateTemplate: async (templateId: string) => {
		const { application } = get();

		assertIsNotNullish(application, {
			message: "Application should not be null when calling generateTemplate",
		});

		try {
			const correlationId = await withRetry(
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

			logTrace("info", "Grant template generation initiated", {
				application_id: application.id,
				correlation_id: correlationId,
				project_id: application.project_id,
				template_id: templateId,
			});
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
			await get().retrieveApplication(application!.project_id, application!.id);
		} catch (error) {
			logError({ error, identifier: "removeFile" });
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
		const ragSource = ragSources.find((source) => source.url === urlToRemove);

		if (!ragSource) {
			toast.error("Cannot remove URL: Source not found");
			return;
		}

		try {
			const deleteSource = isApplicationParent ? deleteApplicationSource : deleteTemplateSource;
			await deleteSource(application!.project_id, parentId, ragSource.sourceId);
			toast.success("URL removed successfully");
			await get().retrieveApplication(application!.project_id, application!.id);
		} catch (error) {
			logError({ error, identifier: "removeUrl" });
			toast.error("Failed to remove URL. Please try again.");
		}
	},

	reset: () => {
		set(structuredClone(initialState));
	},

	retrieveApplication: async (projectId: string, applicationId: string) => {
		set({ areAppOperationsInProgress: true });
		try {
			const response = await handleRetrieveApplication(projectId, applicationId);
			set({
				application: response,
				areAppOperationsInProgress: false,
			});
		} catch (e: unknown) {
			logError({ error: e, identifier: "retrieveApplication" });
			toast.error("Failed to retrieve application");
			set({ areAppOperationsInProgress: false });
		}
	},

	setApplication: (application: NonNullable<ApplicationType>) => {
		set({ application });
	},

	updateApplication: async (data: Partial<API.UpdateApplication.RequestBody>) => {
		const existingApplication = get().application;

		assertIsNotNullish(existingApplication, {
			message: "Application should not be null when calling updateApplication",
		});

		set({ areAppOperationsInProgress: true });

		const updatedApplication = deepmerge(existingApplication, data) as NonNullable<ApplicationType>;

		set({ application: updatedApplication });

		try {
			const response = await handleUpdateApplication(
				existingApplication.project_id,
				existingApplication.id,
				data,
			);
			set({ application: response });
		} catch (e) {
			set({ application: existingApplication });
			logError({ error: `Failed to update application: ${e}`, identifier: "updateApplication" });
			toast.error("Failed to update application");
		} finally {
			set({ areAppOperationsInProgress: false });
		}
	},

	updateApplicationTitle: async (projectId: string, applicationId: string, title: string) => {
		const { application } = get();
		const previousApplication = application;

		try {
			const response = await handleUpdateApplication(projectId, applicationId, { title });
			set({ application: response });
		} catch (error) {
			set({ application: previousApplication });
			logError({ error, identifier: "updateApplicationTitle" });
			toast.error("Failed to update application title");
		}
	},

	updateGrantSections: async (sections: API.UpdateGrantTemplate.RequestBody["grant_sections"]) => {
		const { application } = get();
		const previousGrantSections = application?.grant_template?.grant_sections;

		if (!application?.grant_template?.id) {
			return;
		}

		const updatedApplication: NonNullable<ApplicationType> = {
			...application,
			grant_template: {
				...application.grant_template,
				grant_sections: sections,
			},
		};

		set({ application: updatedApplication });

		try {
			await updateGrantTemplate(application.project_id, application.id, application.grant_template.id, {
				grant_sections: sections,
			});
		} catch (error) {
			const restoredApplication: NonNullable<ApplicationType> = {
				...application,
				grant_template: {
					...application.grant_template,
					grant_sections: previousGrantSections ?? [],
				},
			};
			set({ application: restoredApplication });
			logError({ error, identifier: "updateGrantSections" });
			toast.error("Failed to update grant sections");
		}
	},
}));