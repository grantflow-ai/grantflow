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
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import type { FileWithId } from "@/types/files";
import { createDebounce } from "@/utils/debounce";
import { logError } from "@/utils/logging";
import type { DragEndEvent } from "@dnd-kit/core";

export type ApplicationType = API.RetrieveApplication.Http200.ResponseBody | null;

export interface Objective {
	description: string;
	id: string;
	tasks: string[];
	title: string;
}

export const MAX_OBJECTIVES = 5;

export const EXAMPLE_OBJECTIVES = [
	{
		description:
			"Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus vulputate suspendisse enim. Vel cursus ipsum molestie. Aenean ut volutpat nisl enim. Ornare dolor cursus erat. Accumsan tempor vestibulum sapien at velit odio. Aliquam vel ornare pulvinar congue porttitor sed nisl rutrum blandit. Elit magna nulla mauris pharetra ipsum, vitae tincidunt nibh risus erat. Risus odio fermentum suspendisse mauris. Ullamcorper quis nunc mauris pharetra ipsum, vitae tincidunt nibh risus erat. Risus.",
		title: "Dissect principles of the inhibitory crosstalk and signaling in the TME by comprehensive single-cell profiling of the tumor microenvironment and signaling in PD-1+ tumor infiltrating T cells in cancer patients",
	},
	{
		description:
			"Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus vulputate suspendisse enim. Vel cursus ipsum molestie.",
		title: "Optimize therapeutic targeting strategies",
	},
	{
		description:
			"Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus vulputate suspendisse enim.",
		title: "Develop novel biomarker identification methods",
	},
	{
		description:
			"Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus vulputate suspendisse.",
		title: "Analyze immune cell interactions",
	},
	{
		description: "Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus.",
		title: "Investigate resistance mechanisms",
	},
];

export const DEFAULT_APPLICATION_TITLE = "Untitled Application";
const RETRIEVE_DEBOUNCE_MS = 1000;
const POLLING_INTERVAL_DURATION = 3000;

interface ApplicationState {
	application: ApplicationType;
	applicationTitle: string;
	isGeneratingTemplate: boolean;
	isLoading: boolean;
	objectives: Objective[];
	uploadedFiles: {
		application: FileWithId[];
		template: FileWithId[];
	};
	urls: {
		application: string[];
		template: string[];
	};
}

const initialState: ApplicationState = {
	application: null,
	applicationTitle: "",
	isGeneratingTemplate: false,
	isLoading: false,
	objectives: [],
	uploadedFiles: {
		application: [],
		template: [],
	},
	urls: {
		application: [],
		template: [],
	},
};

interface ApplicationActions {
	addFile: (file: FileWithId, parentId?: string) => Promise<void>;
	addNextObjective: () => void;
	addObjective: (objective: Objective) => void;
	addUrl: (url: string, parentId: string) => Promise<void>;
	areFilesOrUrlsIndexing: () => boolean;
	createApplication: (workspaceId: string) => Promise<void>;
	debouncedRetrieveApplication: () => void;
	generateTemplate: (templateId: string) => Promise<void>;
	getIndexingStatus: () => Promise<boolean>;
	handleApplicationInit: (workspaceId: string, applicationId?: string) => Promise<void>;
	handleObjectiveDragEnd: (event: DragEndEvent) => void;
	handleRetrieveWithPolling: () => Promise<void>;
	removeFile: (file: FileWithId, parentId?: string) => Promise<void>;
	removeObjective: (id: string) => void;
	removeUrl: (url: string, parentId?: string) => Promise<void>;
	reorderObjectives: (objectives: Objective[]) => void;
	retrieveApplication: (workspaceId: string, applicationId: string) => Promise<void>;
	setApplication: (application: NonNullable<ApplicationType>) => void;
	setApplicationTitle: (title: string) => void;
	updateApplication: (data: Partial<API.UpdateApplication.RequestBody>) => Promise<void>;
	updateApplicationTitle: (workspaceId: string, applicationId: string, title: string) => Promise<void>;
	updateGrantSections: (sections: API.UpdateGrantTemplate.RequestBody["grant_sections"]) => Promise<void>;
}

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

		const parentKey = isApplicationParent ? "application" : "template";
		set((state) => ({
			uploadedFiles: {
				...state.uploadedFiles,
				[parentKey]: [...state.uploadedFiles[parentKey], file],
			},
		}));

		try {
			if (process.env.NODE_ENV === "development") {
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
			} else {
				const { createApplicationSourceUploadUrl, createTemplateSourceUploadUrl } = await import(
					"@/actions/sources"
				);
				const createUploadUrl = isApplicationParent
					? createApplicationSourceUploadUrl
					: createTemplateSourceUploadUrl;
				const { url } = await createUploadUrl(application.workspace_id, parentId, file.name);

				await ky(url, {
					body: file,
					headers: {
						"Content-Type": file.type,
					},
					method: "PUT",
				});

				const { extractObjectPathFromUrl } = await import("@/utils/dev-indexing-patch");
				const { triggerDevIndexing } = await import("@/utils/dev-indexing-patch");
				const objectPath = extractObjectPathFromUrl(url);
				if (objectPath) {
					void triggerDevIndexing(objectPath);
				}
			}

			toast.success(`File ${file.name} uploaded successfully`);
			await get().retrieveApplication(application.workspace_id, application.id);
		} catch (error) {
			set((state) => ({
				uploadedFiles: {
					...state.uploadedFiles,
					[parentKey]: state.uploadedFiles[parentKey].filter((f) => f.name !== file.name),
				},
			}));
			logError({ error, identifier: "addFile" });
			toast.error("Failed to upload file. Please try again.");
		}
	},

	addNextObjective: () => {
		const { objectives } = get();
		const currentIndex = objectives.length;
		const exampleObj = EXAMPLE_OBJECTIVES[currentIndex] || EXAMPLE_OBJECTIVES[0];

		get().addObjective({
			description: exampleObj.description,
			id: crypto.randomUUID(),
			tasks: [],
			title: exampleObj.title,
		});
	},

	addObjective: (objective: Objective) => {
		set((state) => ({
			objectives: [...state.objectives, objective],
		}));
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

		const parentKey = isApplicationParent ? "application" : "template";
		const currentUrls = get().urls[parentKey];

		if (currentUrls.includes(url)) {
			return;
		}

		set((state) => ({
			urls: {
				...state.urls,
				[parentKey]: [...state.urls[parentKey], url],
			},
		}));

		try {
			const { crawlApplicationUrl, crawlTemplateUrl } = await import("@/actions/sources");
			const crawlUrl = isApplicationParent ? crawlApplicationUrl : crawlTemplateUrl;
			await crawlUrl(application.workspace_id, parentId, url);
			toast.success("URL added successfully");
			await get().retrieveApplication(application.workspace_id, application.id);
		} catch (error) {
			set((state) => ({
				urls: {
					...state.urls,
					[parentKey]: state.urls[parentKey].filter((u) => u !== url),
				},
			}));
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
		return allSources.some(
			(source) => source.status === ("INDEXING" as const) || source.status === ("CREATED" as const),
		);
	},

	createApplication: async (workspaceId: string) => {
		set({ isLoading: true });
		try {
			const response = await handleCreateApplication(workspaceId, { title: DEFAULT_APPLICATION_TITLE });
			set({
				application: response,
				applicationTitle: response.title,
				isLoading: false,
			});
		} catch (e: unknown) {
			logError({ error: e, identifier: "createApplication" });
			toast.error("Failed to initialize application");
			set({ isLoading: false });
		}
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

	handleApplicationInit: async (workspaceId: string, applicationId?: string) => {
		set({ isLoading: true });
		try {
			await (applicationId
				? get().retrieveApplication(workspaceId, applicationId)
				: get().createApplication(workspaceId));
		} catch (e: unknown) {
			logError({ error: e, identifier: "handleApplicationInit" });
			toast.error(applicationId ? "Failed to retrieve application" : "Failed to initialize application");
		} finally {
			set({ isLoading: false });
		}
	},

	handleObjectiveDragEnd: (event: DragEndEvent) => {
		const { active, over } = event;
		const { objectives, reorderObjectives } = get();

		if (active.id !== over?.id) {
			const oldIndex = objectives.findIndex((obj) => obj.id === active.id);
			const newIndex = objectives.findIndex((obj) => obj.id === over?.id);

			if (oldIndex !== -1 && newIndex !== -1) {
				const reorderedObjectives = [...objectives];
				const [removed] = reorderedObjectives.splice(oldIndex, 1);
				reorderedObjectives.splice(newIndex, 0, removed);
				reorderObjectives(reorderedObjectives);
			}
		}
	},

	handleRetrieveWithPolling: async () => {
		const { getIndexingStatus } = get();
		const { polling } = useWizardStore.getState();
		const isIndexing = await getIndexingStatus();

		if (isIndexing) {
			polling.start(get().handleRetrieveWithPolling, POLLING_INTERVAL_DURATION, false);
		} else {
			polling.stop();
		}
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

		const parentKey = isApplicationParent ? "application" : "template";
		const previousFiles = get().uploadedFiles;
		set((state) => ({
			uploadedFiles: {
				...state.uploadedFiles,
				[parentKey]: state.uploadedFiles[parentKey].filter((f) => f.name !== fileToRemove.name),
			},
		}));

		try {
			const { deleteApplicationSource, deleteTemplateSource } = await import("@/actions/sources");
			const deleteSource = isApplicationParent ? deleteApplicationSource : deleteTemplateSource;
			await deleteSource(application.workspace_id, parentId, fileToRemove.id);
			toast.success(`File ${fileToRemove.name} removed`);
			await get().retrieveApplication(application.workspace_id, application.id);
		} catch (error) {
			set({ uploadedFiles: previousFiles });
			logError({ error, identifier: "removeFile" });
			toast.error("Failed to remove file. Please try again.");
		}
	},

	removeObjective: (id: string) => {
		set((state) => ({
			objectives: state.objectives.filter((obj) => obj.id !== id),
		}));
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

		const parentKey = isApplicationParent ? "application" : "template";
		const previousUrls = get().urls;
		set((state) => ({
			urls: {
				...state.urls,
				[parentKey]: state.urls[parentKey].filter((url) => url !== urlToRemove),
			},
		}));

		try {
			const { deleteApplicationSource, deleteTemplateSource } = await import("@/actions/sources");
			const deleteSource = isApplicationParent ? deleteApplicationSource : deleteTemplateSource;
			await deleteSource(application.workspace_id, parentId, ragSource.sourceId);
			toast.success("URL removed successfully");
			await get().retrieveApplication(application.workspace_id, application.id);
		} catch (error) {
			set({ urls: previousUrls });
			logError({ error, identifier: "removeUrl" });
			toast.error("Failed to remove URL. Please try again.");
		}
	},

	reorderObjectives: (objectives: Objective[]) => {
		set({ objectives });
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

	updateApplication: async (data: Partial<API.UpdateApplication.RequestBody>) => {
		const existingApplication = get().application;

		assertIsNotNullish(existingApplication, {
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