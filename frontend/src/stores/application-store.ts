import { assertIsNotNullish } from "@tool-belt/type-predicates";
import { deepmerge } from "deepmerge-ts";
import ky from "ky";
import { toast } from "sonner";
import { create } from "zustand";
import {
	retrieveApplication as handleRetrieveApplication,
	updateApplication as handleUpdateApplication,
} from "@/actions/grant-applications";
import { generateGrantTemplate, updateGrantTemplate } from "@/actions/grant-template";
import { retrieveRagJob } from "@/actions/rag-jobs";
import { createTemplateSourceUploadUrl } from "@/actions/sources";
import type { API } from "@/types/api-types";
import type { FileWithId } from "@/types/files";
import { createDebounce } from "@/utils/debounce";
import { logError } from "@/utils/logging";

export type ApplicationType = API.RetrieveApplication.Http200.ResponseBody | null;

const RETRIEVE_DEBOUNCE_MS = 1000;

interface ApplicationState {
	application: ApplicationType;
	applicationTitle: string;
	isGeneratingTemplate: boolean;
	isLoading: boolean;
	ragJobState: {
		isRestoring: boolean;
		restoredJob: API.RetrieveRagJob.Http200.ResponseBody | null;
	};
	uploadedFiles: FileWithId[];
	urls: string[];
}

const initialState: ApplicationState = {
	application: null,
	applicationTitle: "",
	isGeneratingTemplate: false,
	isLoading: false,
	ragJobState: {
		isRestoring: false,
		restoredJob: null,
	},
	uploadedFiles: [],
	urls: [],
};

interface ApplicationActions {
	addFile: (file: FileWithId) => Promise<void>;
	addUrl: (url: string) => Promise<void>;
	areFilesOrUrlsIndexing: () => boolean;
	checkAndRestoreJobState: () => Promise<void>;
	clearRestoredJobState: () => void;
	debouncedRetrieveApplication: () => void;
	generateTemplate: (templateId: string) => Promise<void>; // <- this signals the backend to begin the rag process for the grant template ~keep
	getIndexingStatus: () => Promise<boolean>;
	handleRetrieveWithPolling: () => Promise<boolean>;
	removeFile: (file: FileWithId) => Promise<void>;
	removeUrl: (url: string) => Promise<void>;
	reset: () => void;
	retrieveApplication: (workspaceId: string, applicationId: string) => Promise<void>;
	setApplication: (application: NonNullable<ApplicationType>) => void;
	setApplicationTitle: (title: string) => void;
	setUploadedFiles: (files: FileWithId[]) => void;
	setUrls: (urls: string[]) => void;
	updateApplication: (data: Partial<API.UpdateApplication.RequestBody>) => Promise<void>;
	updateApplicationTitle: (workspaceId: string, applicationId: string, title: string) => Promise<void>;
	updateGrantSections: (sections: API.UpdateGrantTemplate.RequestBody["grant_sections"]) => Promise<void>;
}

export const applicationStore = create<ApplicationActions & ApplicationState>((set, get) => ({
	...initialState,
	addFile: async (file: FileWithId) => {
		const { application } = get();

		assertIsNotNullish(application, {
			message: "Application should not be null when calling addFile",
		});

		assertIsNotNullish(application.grant_template, {
			message: "Grant template should not be null when calling addFile",
		});

		set((state) => ({
			uploadedFiles: [...state.uploadedFiles, file],
		}));

		try {
			const { url } = await createTemplateSourceUploadUrl(
				application.workspace_id,
				application.grant_template.id,
				file.name,
			);

			// Dev bypass: send directly to indexer for dev:// URLs ~keep
			if (url.startsWith("dev://indexer/")) {
				const objectPath = url.replace("dev://indexer/", "");
				const { triggerDevIndexing } = await import("@/utils/dev-indexing-patch");
				await triggerDevIndexing(objectPath);
			} else {
				await ky(url, {
					body: file,
					headers: {
						"Content-Type": file.type,
					},
					method: "PUT",
				});
			}

			toast.success(`File ${file.name} uploaded successfully`);
			await get().retrieveApplication(application.workspace_id, application.id);
		} catch (error) {
			set((state) => ({
				uploadedFiles: state.uploadedFiles.filter((f) => f.name !== file.name),
			}));
			logError({ error, identifier: "addFile" });
			toast.error("Failed to upload file. Please try again.");
		}
	},
	addUrl: async (url: string) => {
		const { application } = get();

		assertIsNotNullish(application, {
			message: "Application should not be null when calling addUrl",
		});

		assertIsNotNullish(application.grant_template, {
			message: "Grant template should not be null when calling addUrl",
		});

		if (get().urls.includes(url)) {
			return;
		}

		set((state) => ({
			urls: [...state.urls, url],
		}));

		try {
			const { crawlTemplateUrl } = await import("@/actions/sources");
			await crawlTemplateUrl(application.workspace_id, application.grant_template.id, url);
			toast.success("URL added successfully");
			await get().retrieveApplication(application.workspace_id, application.id);
		} catch (error) {
			set((state) => ({
				urls: state.urls.filter((u) => u !== url),
			}));
			logError({ error, identifier: "addUrl" });
			toast.error("Failed to process URL. Please try again.");
		}
	},

	areFilesOrUrlsIndexing: () => {
		const { application } = get();
		if (!application) {
			return false;
		}

		const allSources = [...application.rag_sources, ...(application.grant_template?.rag_sources ?? [])];
		// CREATED is the status before processing begins ~keep
		return allSources.some(
			(source) => source.status === ("INDEXING" as const) || source.status === ("CREATED" as const),
		);
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

	debouncedRetrieveApplication: (() => {
		const debouncedFn = createDebounce(() => {
			void get().handleRetrieveWithPolling();
		}, RETRIEVE_DEBOUNCE_MS);

		return () => {
			debouncedFn.call();
		};
	})(),

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

	handleRetrieveWithPolling: async () => {
		const { getIndexingStatus } = get();
		const isIndexing = await getIndexingStatus();

		return isIndexing;
	},

	removeFile: async (fileToRemove: FileWithId) => {
		const { application } = get();

		assertIsNotNullish(application, {
			message: "Application should not be null when calling removeFile",
		});

		assertIsNotNullish(application.grant_template, {
			message: "Grant template should not be null when calling removeFile",
		});

		if (!fileToRemove.id) {
			toast.error("Cannot remove file: File ID not found");
			return;
		}

		const previousFiles = get().uploadedFiles;
		set((state) => ({
			uploadedFiles: state.uploadedFiles.filter((f) => f.name !== fileToRemove.name),
		}));

		try {
			const { deleteTemplateSource } = await import("@/actions/sources");
			await deleteTemplateSource(application.workspace_id, application.grant_template.id, fileToRemove.id);
			toast.success(`File ${fileToRemove.name} removed`);
			await get().retrieveApplication(application.workspace_id, application.id);
		} catch (error) {
			set({ uploadedFiles: previousFiles });
			logError({ error, identifier: "removeFile" });
			toast.error("Failed to remove file. Please try again.");
		}
	},

	removeUrl: async (urlToRemove: string) => {
		const { application } = get();

		assertIsNotNullish(application, {
			message: "Application should not be null when calling removeUrl",
		});

		assertIsNotNullish(application.grant_template, {
			message: "Grant template should not be null when calling removeUrl",
		});

		const ragSource = application.grant_template.rag_sources.find((source) => source.url === urlToRemove);
		if (!ragSource) {
			toast.error("Cannot remove URL: Source not found");
			return;
		}

		const previousUrls = get().urls;
		set((state) => ({
			urls: state.urls.filter((url) => url !== urlToRemove),
		}));

		try {
			const { deleteTemplateSource } = await import("@/actions/sources");
			await deleteTemplateSource(application.workspace_id, application.grant_template.id, ragSource.sourceId);
			toast.success("URL removed successfully");
			await get().retrieveApplication(application.workspace_id, application.id);
		} catch (error) {
			set({ urls: previousUrls });
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
				applicationTitle: response.title,
				isLoading: false,
			});
		} catch (e: unknown) {
			logError({ error: e, identifier: "retrieveApplication" });
			toast.error("Failed to retrieve application");
			set({ isLoading: false });
		}
	},

	setApplication: (application: NonNullable<ApplicationType>) => {
		set({
			application,
			applicationTitle: application.title,
		});
	},

	setApplicationTitle: (title: string) => {
		set((state) => ({
			application: state.application ? { ...state.application, title } : state.application,
			applicationTitle: title,
		}));
	},

	setUploadedFiles: (files: FileWithId[]) => {
		set({ uploadedFiles: files });
	},

	setUrls: (urls: string[]) => {
		set({ urls });
	},

	updateApplication: async (data: Partial<API.UpdateApplication.RequestBody>) => {
		const existingApplication = get().application;

		assertIsNotNullish(existingApplication, {
			// <- this is a type assertion. It narrows down the type by throwing ~keep
			message: "Application should not be null when calling updateApplication",
		});

		set({ isLoading: true });

		const updatedApplication = deepmerge(existingApplication, data) as NonNullable<ApplicationType>;

		set({
			application: updatedApplication,
			applicationTitle: updatedApplication.title,
		});

		try {
			const response = await handleUpdateApplication(
				existingApplication.workspace_id,
				existingApplication.id,
				data,
			);
			set({
				application: response,
			});
		} catch (e) {
			set({
				application: existingApplication,
			});
			logError({ error: `Failed to update application: ${e}`, identifier: "updateApplication" });
			toast.error("Failed to update application");
		} finally {
			set({ isLoading: false });
		}
	},

	updateApplicationTitle: async (workspaceId: string, applicationId: string, title: string) => {
		const { application, applicationTitle } = get();

		const previousTitle = applicationTitle;
		const previousApplication = application;

		try {
			const response = await handleUpdateApplication(workspaceId, applicationId, { title });
			set({
				application: response,
				applicationTitle: response.title,
			});
		} catch (error) {
			set({
				application: previousApplication,
				applicationTitle: previousTitle,
			});
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
