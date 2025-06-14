import { toast } from "sonner";
import { create } from "zustand";

import { createApplication, retrieveApplication, updateApplication } from "@/actions/grant-applications";
import { generateGrantTemplate } from "@/actions/grant-template";
import { FileWithId } from "@/components/workspaces/wizard/application-preview";
import { WIZARD_STEP_TITLES } from "@/constants";
import { API } from "@/types/api-types";
import { logError } from "@/utils/logging";

export type ApplicationType =
	| API.CreateApplication.Http201.ResponseBody
	| API.RetrieveApplication.Http200.ResponseBody
	| null;

const DEBOUNCE_DELAY_MS = 500;
export const DEFAULT_APPLICATION_TITLE = "Untitled Application";
export const MIN_TITLE_LENGTH = 10;

interface WizardActions {
	addFile: (file: FileWithId) => void;
	addUrl: (url: string) => void;
	generateTemplate: (workspaceId: string, applicationId: string, templateId: string) => Promise<void>;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
	handleApplicationInit: (workspaceId: string, applicationId?: string) => Promise<void>;
	removeFile: (fileToRemove: FileWithId) => void;
	removeUrl: (url: string) => void;
	setApplication: (application: Exclude<ApplicationType, null>) => void;
	setApplicationId: (id: string) => void;
	setApplicationTitle: (title: string) => void;
	setConnectionStatus: (status?: string) => void;
	setConnectionStatusColor: (color?: string) => void;
	setCurrentStep: (step: number) => void;
	setFileDropdownOpen: (fileId: string, open: boolean) => void;
	setIsCreatingApplication: (loading: boolean) => void;
	setIsGeneratingTemplate: (loading: boolean) => void;
	setLinkHoverState: (url: string, hovered: boolean) => void;
	setTemplateId: (id: string) => void;
	setUploadedFiles: (files: FileWithId[]) => void;
	setUrlInput: (input: string) => void;
	setUrls: (urls: string[]) => void;
	setWorkspaceId: (id: string) => void;
	updateApplicationTitle: (title: string) => Promise<void>;
	validateStepNext: () => boolean;
}

interface WizardState {
	application: ApplicationType;
	applicationId: null | string;
	applicationTitle: string;
	connectionStatus?: string;
	connectionStatusColor?: string;
	currentStep: number;
	isCreatingApplication: boolean;
	isGeneratingTemplate: boolean;
	templateId: null | string;
	ui: WizardUI;
	uploadedFiles: FileWithId[];
	urls: string[];
	workspaceId: string;
}

interface WizardUI {
	fileDropdownStates: Record<string, boolean>;
	linkHoverStates: Record<string, boolean>;
	urlInput: string;
}

let titleUpdateTimeout: NodeJS.Timeout | null = null;

export const useWizardStore = create<WizardActions & WizardState>((set, get) => ({
	addFile: (file: FileWithId) => {
		set((state) => ({
			uploadedFiles: [...state.uploadedFiles, file],
		}));
	},
	addUrl: (url: string) => {
		set((state) => ({
			urls: state.urls.includes(url) ? state.urls : [...state.urls, url],
		}));
	},
	application: null,
	applicationId: null,
	applicationTitle: DEFAULT_APPLICATION_TITLE,
	connectionStatus: undefined,
	connectionStatusColor: undefined,
	currentStep: 0,
	generateTemplate: async (workspaceId: string, applicationId: string, templateId: string) => {
		set({ isGeneratingTemplate: true });
		try {
			await generateGrantTemplate(workspaceId, applicationId, templateId);
		} catch {
			toast.error("Failed to generate grant template. Please try again.");
		} finally {
			set({ isGeneratingTemplate: false });
		}
	},
	goToNextStep: () => {
		const state = get();
		if (state.currentStep === WIZARD_STEP_TITLES.length - 1) {
			return;
		}

		if (
			state.currentStep === 0 &&
			state.application?.grant_template &&
			!state.application.grant_template.grant_sections.length
		) {
			void get().generateTemplate(state.workspaceId, state.application.id, state.application.grant_template.id);
		}
		set({ currentStep: state.currentStep + 1 });
	},
	goToPreviousStep: () => {
		const state = get();
		set({ currentStep: Math.max(0, state.currentStep - 1) });
	},

	handleApplicationInit: async (workspaceId: string, applicationId?: string) => {
		set({ isCreatingApplication: true, workspaceId });
		try {
			if (applicationId) {
				const response = await retrieveApplication(workspaceId, applicationId);

				const allRagSources = [...response.rag_sources, ...(response.grant_template?.rag_sources ?? [])];

				const urls = allRagSources.filter((source) => source.url).map((source) => source.url!);

				const uploadedFiles: FileWithId[] = allRagSources
					.filter((source) => source.filename)
					.map(
						(source) =>
							({
								arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
								id: source.sourceId,
								lastModified: Date.now(),
								name: source.filename!,
								size: 0,
								slice: () => new Blob(),
								stream: () => new ReadableStream(),
								text: () => Promise.resolve(""),
								type: "",
								webkitRelativePath: "",
							}) as FileWithId,
					);

				set({
					application: response,
					applicationId: response.id,
					applicationTitle: response.title,
					isCreatingApplication: false,
					templateId: response.grant_template?.id ?? null,
					uploadedFiles,
					urls,
				});
			} else {
				const response = await createApplication(workspaceId, {
					title: DEFAULT_APPLICATION_TITLE,
				});
				set({
					application: response,
					applicationId: response.id,
					applicationTitle: "",
					isCreatingApplication: false,
					templateId: response.grant_template?.id ?? null,
				});
			}
		} catch (e: unknown) {
			logError({ error: e, identifier: "application-wizard-init" });
			toast.error(applicationId ? "Failed to retrieve application" : "Failed to initialize application");
			throw e;
		}
	},

	isCreatingApplication: true,

	isGeneratingTemplate: false,

	removeFile: (fileToRemove: FileWithId) => {
		set((state) => ({
			uploadedFiles: state.uploadedFiles.filter((f) => f.name !== fileToRemove.name),
		}));
	},

	removeUrl: (urlToRemove: string) => {
		set((state) => ({
			urls: state.urls.filter((url) => url !== urlToRemove),
		}));
	},

	setApplication: (application: Exclude<ApplicationType, null>) => {
		set({ application });
	},

	setApplicationId: (id: string) => {
		set({ applicationId: id });
	},

	setApplicationTitle: (title: string) => {
		set({ applicationTitle: title });

		const state = get();
		if (state.applicationId && title.trim()) {
			if (titleUpdateTimeout) {
				clearTimeout(titleUpdateTimeout);
			}
			titleUpdateTimeout = setTimeout(() => {
				void get().updateApplicationTitle(title);
			}, DEBOUNCE_DELAY_MS);
		}
	},

	setConnectionStatus: (status?: string) => {
		set({ connectionStatus: status });
	},

	setConnectionStatusColor: (color?: string) => {
		set({ connectionStatusColor: color });
	},

	setCurrentStep: (step: number) => {
		set({ currentStep: Math.max(0, Math.min(WIZARD_STEP_TITLES.length - 1, step)) });
	},

	setFileDropdownOpen: (fileId: string, open: boolean) => {
		set((state) => ({
			ui: {
				...state.ui,
				fileDropdownStates: {
					...state.ui.fileDropdownStates,
					[fileId]: open,
				},
			},
		}));
	},

	setIsCreatingApplication: (loading: boolean) => {
		set({ isCreatingApplication: loading });
	},

	setIsGeneratingTemplate: (loading: boolean) => {
		set({ isGeneratingTemplate: loading });
	},

	setLinkHoverState: (url: string, hovered: boolean) => {
		set((state) => ({
			ui: {
				...state.ui,
				linkHoverStates: {
					...state.ui.linkHoverStates,
					[url]: hovered,
				},
			},
		}));
	},

	setTemplateId: (id: string) => {
		set({ templateId: id });
	},

	setUploadedFiles: (files: FileWithId[]) => {
		set({ uploadedFiles: files });
	},

	setUrlInput: (input: string) => {
		set((state) => ({
			ui: { ...state.ui, urlInput: input },
		}));
	},

	setUrls: (urls: string[]) => {
		set({ urls });
	},

	setWorkspaceId: (id: string) => {
		set({ workspaceId: id });
	},

	templateId: null,

	ui: {
		fileDropdownStates: {},
		linkHoverStates: {},
		urlInput: "",
	},

	updateApplicationTitle: async (title: string) => {
		const state = get();
		if (!state.applicationId || !state.workspaceId) {
			return;
		}

		try {
			await updateApplication(state.workspaceId, state.applicationId, {
				title,
			});
		} catch {
			toast.error("Failed to update application title");
		}
	},

	uploadedFiles: [],

	urls: [],

	validateStepNext: () => {
		const state = get();
		if (!state.application || state.isGeneratingTemplate) {
			return false;
		}
		if (state.currentStep === 0) {
			return (
				state.applicationTitle.trim().length >= MIN_TITLE_LENGTH &&
				(state.urls.length > 0 || state.uploadedFiles.length > 0)
			);
		}
		if (state.currentStep === 1) {
			return !!state.application.grant_template?.grant_sections.length;
		}
		if (state.currentStep === 2) {
			return (
				!!state.application.rag_sources.length &&
				state.application.rag_sources.every((source) => source.status !== "FAILED")
			);
		}
		return false;
	},

	workspaceId: "",
}));
