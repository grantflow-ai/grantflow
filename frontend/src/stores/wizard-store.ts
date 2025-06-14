import { toast } from "sonner";
import { create } from "zustand";

import { createApplication, retrieveApplication, updateApplication } from "@/actions/grant-applications";
import { generateGrantTemplate } from "@/actions/grant-template";
import { FileWithId } from "@/components/workspaces/wizard/application-preview";
import { WIZARD_STEP_TITLES } from "@/constants";
import { API } from "@/types/api-types";
import { createDebounce } from "@/utils/debounce";
import { logError } from "@/utils/logging";

export type ApplicationType =
	| API.CreateApplication.Http201.ResponseBody
	| API.RetrieveApplication.Http200.ResponseBody
	| null;

const DEBOUNCE_DELAY_MS = 500;
export const DEFAULT_APPLICATION_TITLE = "Untitled Application";
export const MIN_TITLE_LENGTH = 10;

interface PollingActions {
	start: (apiFunction: () => Promise<void>, duration: number, callImmediately?: boolean) => void;
	stop: () => void;
}

interface PollingState {
	intervalId: NodeJS.Timeout | null;
	isActive: boolean;
}

interface WizardActions {
	addFile: (file: FileWithId) => void;
	addUrl: (url: string) => void;
	areFilesOrUrlsIndexing: () => boolean;
	createApplication: () => Promise<void>;
	generateTemplate: (workspaceId: string, applicationId: string, templateId: string) => Promise<void>;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
	handleApplicationInit: (workspaceId: string, applicationId?: string) => Promise<void>;
	polling: PollingActions;
	removeFile: (fileToRemove: FileWithId) => void;
	removeUrl: (url: string) => void;
	retrieveApplication: () => Promise<void>;
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
	polling: PollingState;
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

	areFilesOrUrlsIndexing: () => {
		const { application } = get();
		if (!application) {
			return false;
		}

		const allSources = [...application.rag_sources, ...(application.grant_template?.rag_sources ?? [])];
		return allSources.some((source) => source.status === "INDEXING");
	},
	connectionStatus: undefined,
	connectionStatusColor: undefined,
	createApplication: async () => {
		const { workspaceId } = get();

		if (!workspaceId) {
			throw new Error("No workspace ID found");
		}

		try {
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
		} catch (e: unknown) {
			logError({ error: e, identifier: "application-wizard-create" });
			toast.error("Failed to initialize application");
			throw e;
		}
	},
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
		const { application, currentStep, workspaceId } = get();
		if (currentStep === WIZARD_STEP_TITLES.length - 1) {
			return;
		}

		if (currentStep === 0 && application?.grant_template && !application.grant_template.grant_sections.length) {
			void get().generateTemplate(workspaceId, application.id, application.grant_template.id);
		}
		set({ currentStep: currentStep + 1 });
	},
	goToPreviousStep: () => {
		const { currentStep } = get();
		set({ currentStep: Math.max(0, currentStep - 1) });
	},

	handleApplicationInit: async (workspaceId: string, applicationId?: string) => {
		set({
			applicationId: applicationId ?? null,
			isCreatingApplication: true,
			workspaceId,
		});

		try {
			await (applicationId ? get().retrieveApplication() : get().createApplication());
		} catch (e: unknown) {
			logError({ error: e, identifier: "handleApplicationInit" });
			toast.error(applicationId ? "Failed to retrieve application" : "Failed to initialize application");
			throw e;
		}
	},

	isCreatingApplication: true,

	isGeneratingTemplate: false,

	polling: {
		intervalId: null,
		isActive: false,
		start: (apiFunction: () => Promise<void>, duration: number, callImmediately = true) => {
			const { polling } = get();
			if (polling.isActive || polling.intervalId) {
				return;
			}

			set((state) => ({
				polling: {
					...state.polling,
					isActive: true,
				},
			}));

			if (callImmediately) {
				void apiFunction();
			}

			const intervalId = setInterval(() => {
				void apiFunction();
			}, duration);

			set((state) => ({
				polling: {
					...state.polling,
					intervalId,
				},
			}));
		},

		stop: () => {
			const { polling } = get();
			if (polling.intervalId) {
				clearInterval(polling.intervalId);
			}

			set((state) => ({
				polling: {
					...state.polling,
					intervalId: null,
					isActive: false,
				},
			}));
		},
	},

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

	retrieveApplication: async () => {
		const { applicationId, workspaceId } = get();

		if (!workspaceId || !applicationId) {
			return;
		}

		try {
			const response = await retrieveApplication(workspaceId, applicationId);

			set({
				application: response,
				applicationId: response.id,
				isCreatingApplication: false,
				templateId: response.grant_template?.id ?? null,
			});
		} catch (e: unknown) {
			logError({ error: e, identifier: "retrieveApplication" });
			toast.error("Failed to retrieve application");
			throw e;
		}
	},

	setApplication: (application: Exclude<ApplicationType, null>) => {
		set({ application });
	},

	setApplicationId: (id: string) => {
		set({ applicationId: id });
	},

	setApplicationTitle: (title: string) => {
		set({ applicationTitle: title });

		const { applicationId, updateApplicationTitle } = get();
		if (applicationId && title.trim()) {
			const debouncedUpdate = createDebounce(() => {
				void updateApplicationTitle(title);
			}, DEBOUNCE_DELAY_MS);
			debouncedUpdate.call();
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
		const { applicationId, workspaceId } = get();
		if (!applicationId || !workspaceId) {
			return;
		}

		try {
			await updateApplication(workspaceId, applicationId, {
				title,
			});
		} catch {
			toast.error("Failed to update application title");
		}
	},

	uploadedFiles: [],

	urls: [],

	validateStepNext: () => {
		const { application, applicationTitle, currentStep, isGeneratingTemplate, uploadedFiles, urls } = get();
		if (!application || isGeneratingTemplate) {
			return false;
		}
		if (currentStep === 0) {
			return applicationTitle.trim().length >= MIN_TITLE_LENGTH && (urls.length > 0 || uploadedFiles.length > 0);
		}
		if (currentStep === 1) {
			return !!application.grant_template?.grant_sections.length;
		}
		if (currentStep === 2) {
			return (
				!!application.rag_sources.length &&
				application.rag_sources.every((source) => source.status !== "FAILED")
			);
		}
		return false;
	},

	workspaceId: "",
}));
