import { assertIsNotNullish } from "@tool-belt/type-predicates";
import { deepmerge } from "deepmerge-ts";
import ky from "ky";
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
import { logError } from "@/utils/logging";

export type ApplicationType = API.RetrieveApplication.Http200.ResponseBody | null;

export const DEFAULT_APPLICATION_TITLE = "Untitled Application";

interface ApplicationState {
	application: ApplicationType;
	isGeneratingTemplate: boolean;
	isLoading: boolean;
	ragJobState: {
		isRestoring: boolean;
		restoredJob: API.RetrieveRagJob.Http200.ResponseBody | null;
	};
}

const initialState: ApplicationState = {
	application: null,
	isGeneratingTemplate: false,
	isLoading: false,
	ragJobState: {
		isRestoring: false,
		restoredJob: null,
	},
};

interface ApplicationActions {
	addFile: (file: FileWithId, parentId?: string) => Promise<void>;
	addUrl: (url: string, parentId: string) => Promise<void>;
	areFilesOrUrlsIndexing: () => boolean;
	checkAndRestoreJobState: () => Promise<void>;
	clearRestoredJobState: () => void;
	createApplication: (workspaceId: string) => Promise<void>;
	generateTemplate: (templateId: string) => Promise<void>;
	getIndexingStatus: () => Promise<boolean>;
	removeFile: (file: FileWithId, parentId?: string) => Promise<void>;
	removeUrl: (url: string, parentId?: string) => Promise<void>;
	reset: () => void;
	retrieveApplication: (workspaceId: string, applicationId: string) => Promise<void>;
	setApplication: (application: NonNullable<ApplicationType>) => void;
	updateApplication: (data: Partial<API.UpdateApplication.RequestBody>) => Promise<void>;
	updateApplicationTitle: (workspaceId: string, applicationId: string, title: string) => Promise<void>;
	updateGrantSections: (sections: API.UpdateGrantTemplate.RequestBody["grant_sections"]) => Promise<void>;
}

const uploadFileInDevelopment = async (
	file: FileWithId,
	application: NonNullable<ApplicationType>,
	parentId: string,
	isApplicationParent: boolean,
) => {
	const parentPath = isApplicationParent ? "application" : "grant_template";
	const objectPath = `workspace/${application.workspace_id}/${parentPath}/${parentId}/${file.name}`;
	const emulatorUrl = `http://localhost:4443/upload/storage/v1/b/grantflow-uploads/o?uploadType=media&name=${objectPath}`;

	await ky(emulatorUrl, {
		body: file,
		headers: {
			"Content-Type": file.type,
		},
		method: "POST",
	});

	const { triggerDevIndexing } = await import("@/utils/dev-indexing-patch");
	void triggerDevIndexing(objectPath);
};

const uploadFileInProduction = async (
	file: FileWithId,
	application: NonNullable<ApplicationType>,
	parentId: string,
	isApplicationParent: boolean,
) => {
	const createUploadUrl = isApplicationParent ? createApplicationSourceUploadUrl : createTemplateSourceUploadUrl;
	const { url } = await createUploadUrl(application.workspace_id, parentId, file.name);

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

	addFile: async (file: FileWithId, parentId?: string) => {
		const { application } = get();

		if (!parentId) {
			toast.error("Cannot upload file: Parent ID missing");
			return;
		}

		assertIsNotNullish(application, {
			message: "Application should not be null when calling addFile",
		});

		const isApplicationParent = parentId === application.id;
		const isTemplateParent = parentId === application.grant_template?.id;

		if (!(isApplicationParent || isTemplateParent)) {
			logError({
				error: `Invalid parentId: ${parentId}. Must be application.id or grant_template.id`,
				identifier: "addFile",
			});
			return;
		}

		if (isTemplateParent) {
			assertIsNotNullish(application.grant_template, {
				message: "Grant template should not be null when uploading to template parent",
			});
		}

		try {
			await (process.env.NODE_ENV === "development"
				? uploadFileInDevelopment(file, application, parentId, isApplicationParent)
				: uploadFileInProduction(file, application, parentId, isApplicationParent));

			toast.success(`File ${file.name} uploaded successfully`);
			await get().retrieveApplication(application.workspace_id, application.id);
		} catch (error) {
			logError({ error, identifier: "addFile" });
			toast.error("Failed to upload file. Please try again.");
		}
	},

	addUrl: async (url: string, parentId: string) => {
		const { application } = get();

		assertIsNotNullish(application, {
			message: "Application should not be null when calling addUrl",
		});

		const isApplicationParent = parentId === application.id;
		const isTemplateParent = parentId === application.grant_template?.id;

		if (!(isApplicationParent || isTemplateParent)) {
			logError({
				error: `Invalid parentId: ${parentId}. Must be application.id or grant_template.id`,
				identifier: "addUrl",
			});
			return;
		}

		if (isTemplateParent) {
			assertIsNotNullish(application.grant_template, {
				message: "Grant template should not be null when adding URL to template parent",
			});
		}

		try {
			const crawlUrl = isApplicationParent ? crawlApplicationUrl : crawlTemplateUrl;
			await crawlUrl(application.workspace_id, parentId, url);
			toast.success("URL added successfully");
			await get().retrieveApplication(application.workspace_id, application.id);
		} catch (error) {
			logError({ error, identifier: "addUrl" });
			toast.error("Failed to process URL. Please try again.");
		}
	},

	areFilesOrUrlsIndexing: () => {
		const { application } = get();
		if (!application) {
			logError({ error: "Could not find Application", identifier: "areFilesOrUrlsIndexing" });
			return false;
		}

		const allSources = [...application.rag_sources, ...(application.grant_template?.rag_sources ?? [])];
		return allSources.some((source) => source.status === "INDEXING" || source.status === "CREATED");
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
			const jobData = await retrieveRagJob(application.workspace_id, ragJobId);

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

	createApplication: async (workspaceId: string) => {
		set({ isLoading: true });
		try {
			const response = await handleCreateApplication(workspaceId, { title: DEFAULT_APPLICATION_TITLE });
			set({
				application: response,
				isLoading: false,
			});
		} catch (e: unknown) {
			logError({ error: e, identifier: "createApplication" });
			toast.error("Failed to initialize application");
			set({ isLoading: false });
		}
	},

	generateTemplate: async (templateId: string) => {
		set({ isGeneratingTemplate: true });

		const { application } = get();

		assertIsNotNullish(application, {
			message: "Application should not be null when calling generateTemplate",
		});
		try {
			await generateGrantTemplate(application.workspace_id, application.id, templateId);
		} catch {
			toast.error("Failed to generate grant template. Please try again.");
		} finally {
			set({ isGeneratingTemplate: false });
		}
	},

	getIndexingStatus: async () => {
		const { application, areFilesOrUrlsIndexing, retrieveApplication } = get();
		if (application) {
			await retrieveApplication(application.workspace_id, application.id);
		}
		return areFilesOrUrlsIndexing();
	},

	removeFile: async (fileToRemove: FileWithId, parentId?: string) => {
		const { application } = get();

		if (!parentId) {
			toast.error("Cannot remove file: Parent ID not found");
			return;
		}

		assertIsNotNullish(application, {
			message: "Application should not be null when calling removeFile",
		});

		const isApplicationParent = parentId === application.id;
		const isTemplateParent = parentId === application.grant_template?.id;

		if (!(isApplicationParent || isTemplateParent)) {
			logError({
				error: `Invalid parentId: ${parentId}. Must be application.id or grant_template.id`,
				identifier: "removeFile",
			});
			return;
		}

		if (!fileToRemove.id) {
			toast.error("Cannot remove file: File ID not found");
			return;
		}

		try {
			const deleteSource = isApplicationParent ? deleteApplicationSource : deleteTemplateSource;
			await deleteSource(application.workspace_id, parentId, fileToRemove.id);
			toast.success(`File ${fileToRemove.name} removed`);
			await get().retrieveApplication(application.workspace_id, application.id);
		} catch (error) {
			logError({ error, identifier: "removeFile" });
			toast.error("Failed to remove file. Please try again.");
		}
	},

	removeUrl: async (urlToRemove: string, parentId?: string) => {
		const { application } = get();

		if (!parentId) {
			toast.error("Cannot remove URL: Parent ID not found");
			return;
		}

		assertIsNotNullish(application, {
			message: "Application should not be null when calling removeUrl",
		});

		const isApplicationParent = parentId === application.id;
		const isTemplateParent = parentId === application.grant_template?.id;

		if (!(isApplicationParent || isTemplateParent)) {
			logError({
				error: `Invalid parentId: ${parentId}. Must be application.id or grant_template.id`,
				identifier: "removeUrl",
			});
			return;
		}

		const ragSources = isApplicationParent
			? application.rag_sources
			: (application.grant_template?.rag_sources ?? []);
		const ragSource = ragSources.find((source) => source.url === urlToRemove);

		if (!ragSource) {
			toast.error("Cannot remove URL: Source not found");
			return;
		}

		try {
			const deleteSource = isApplicationParent ? deleteApplicationSource : deleteTemplateSource;
			await deleteSource(application.workspace_id, parentId, ragSource.sourceId);
			toast.success("URL removed successfully");
			await get().retrieveApplication(application.workspace_id, application.id);
		} catch (error) {
			logError({ error, identifier: "removeUrl" });
			toast.error("Failed to remove URL. Please try again.");
		}
	},

	reset: () => {
		set(structuredClone(initialState));
	},

	retrieveApplication: async (workspaceId: string, applicationId: string) => {
		set({ isLoading: true });
		try {
			const response = await handleRetrieveApplication(workspaceId, applicationId);
			set({
				application: response,
				isLoading: false,
			});
		} catch (e: unknown) {
			logError({ error: e, identifier: "retrieveApplication" });
			toast.error("Failed to retrieve application");
			set({ isLoading: false });
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

		set({ isLoading: true });

		const updatedApplication = deepmerge(existingApplication, data) as NonNullable<ApplicationType>;

		set({ application: updatedApplication });

		try {
			const response = await handleUpdateApplication(
				existingApplication.workspace_id,
				existingApplication.id,
				data,
			);
			set({ application: response });
		} catch (e) {
			set({ application: existingApplication });
			logError({ error: `Failed to update application: ${e}`, identifier: "updateApplication" });
			toast.error("Failed to update application");
		} finally {
			set({ isLoading: false });
		}
	},

	updateApplicationTitle: async (workspaceId: string, applicationId: string, title: string) => {
		const { application } = get();
		const previousApplication = application;

		try {
			const response = await handleUpdateApplication(workspaceId, applicationId, { title });
			set({ application: response });
		} catch (error) {
			set({ application: previousApplication });
			logError({ error, identifier: "updateApplicationTitle" });
			toast.error("Failed to update application title");
		}
	},

	updateGrantSections: async (sections: API.UpdateGrantTemplate.RequestBody["grant_sections"]) => {
		const { application } = get();

		if (!application?.grant_template?.id) {
			return;
		}

		try {
			await updateGrantTemplate(application.workspace_id, application.id, application.grant_template.id, {
				grant_sections: sections,
			});
		} catch (error) {
			logError({ error, identifier: "updateGrantSections" });
			toast.error("Failed to update grant sections");
		}
	},
}));
