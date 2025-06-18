import { toast } from "sonner";
import { create } from "zustand";

import { createApplication, retrieveApplication, updateApplication } from "@/actions/grant-applications";
import { generateGrantTemplate, updateGrantTemplate } from "@/actions/grant-template";
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

interface ApplicationState {
	application: ApplicationType;
	applicationId: null | string;
	applicationTitle: string;
	templateId: null | string;
	wsConnectionStatus?: string;
	wsConnectionStatusColor?: string;
}

interface ContentState {
	uploadedFiles: FileWithId[];
	urls: string[];
}

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
	handleApplicationInit: (workspaceId: string, applicationId?: string) => Promise<void>;
	polling: PollingActions;
	removeFile: (fileToRemove: FileWithId) => void;
	removeUrl: (url: string) => void;
	retrieveApplication: () => Promise<void>;
	setApplication: (application: Exclude<ApplicationType, null>) => void;
	setApplicationId: (id: string) => void;
	setApplicationTitle: (title: string) => void;
	setCurrentStep: (step: number) => void;
	setFileDropdownOpen: (fileId: string, open: boolean) => void;
	setLinkHoverState: (url: string, hovered: boolean) => void;
	setTemplateId: (id: string) => void;
	setUploadedFiles: (files: FileWithId[]) => void;
	setUrlInput: (input: string) => void;
	setUrls: (urls: string[]) => void;
	setWorkspaceId: (id: string) => void;
	setWsConnectionStatus: (status?: string) => void;
	setWsConnectionStatusColor: (color?: string) => void;
	toNextStep: () => void;
	toPreviousStep: () => void;
	updateApplicationTitle: (title: string) => Promise<void>;
	updateGrantSections: (sections: API.UpdateGrantTemplate.RequestBody["grant_sections"]) => Promise<void>;
	validateStepNext: () => boolean;
}

interface WizardState {
	applicationState: ApplicationState;
	contentState: ContentState;
	isLoading: boolean;
	polling: PollingState;
	ui: WizardUI;
	workspaceId: string;
}

interface WizardUI {
	currentStep: number;
	fileDropdownStates: Record<string, boolean>;
	linkHoverStates: Record<string, boolean>;
	urlInput: string;
}

export const useWizardStore = create<WizardActions & WizardState>((set, get) => ({
	addFile: (file: FileWithId) => {
		set(({ contentState, ...state }) => ({
			...state,
			contentState: {
				...contentState,
				uploadedFiles: [...contentState.uploadedFiles, file],
			},
		}));
	},
	addUrl: (url: string) => {
		set(({ contentState, ...state }) => ({
			...state,
			contentState: {
				...contentState,
				urls: contentState.urls.includes(url) ? contentState.urls : [...contentState.urls, url],
			},
		}));
	},

	applicationState: {
		application: null,
		applicationId: null,
		applicationTitle: DEFAULT_APPLICATION_TITLE,
		templateId: null,
		wsConnectionStatus: undefined,
		wsConnectionStatusColor: undefined,
	},

	areFilesOrUrlsIndexing: () => {
		const {
			applicationState: { application },
		} = get();
		if (!application) {
			return false;
		}

		const allSources = [...application.rag_sources, ...(application.grant_template?.rag_sources ?? [])];
		return allSources.some((source) => source.status === "INDEXING");
	},
	contentState: {
		uploadedFiles: [],
		urls: [],
	},
	createApplication: async () => {
		const { workspaceId } = get();

		if (!workspaceId) {
			throw new Error("No workspace ID found");
		}

		set({ isLoading: true });
		try {
			const response = await createApplication(workspaceId, {
				title: DEFAULT_APPLICATION_TITLE,
			});
			set(({ applicationState, ...state }) => ({
				...state,
				applicationState: {
					...applicationState,
					application: response,
					applicationId: response.id,
					applicationTitle: "",
					templateId: response.grant_template?.id ?? null,
				},
			}));
		} catch (e: unknown) {
			logError({ error: e, identifier: "application-wizard-create" });
			toast.error("Failed to initialize application");
			throw e;
		} finally {
			set({ isLoading: false });
		}
	},
	generateTemplate: async (workspaceId: string, applicationId: string, templateId: string) => {
		set({ isLoading: true });
		try {
			await generateGrantTemplate(workspaceId, applicationId, templateId);
		} catch {
			toast.error("Failed to generate grant template. Please try again.");
		} finally {
			set({ isLoading: false });
		}
	},
	handleApplicationInit: async (workspaceId: string, applicationId?: string) => {
		set(({ applicationState, ...state }) => ({
			...state,
			applicationState: {
				...applicationState,
				applicationId: applicationId ?? null,
			},
			isLoading: true,
			workspaceId,
		}));

		try {
			await (applicationId ? get().retrieveApplication() : get().createApplication());
		} catch (e: unknown) {
			logError({ error: e, identifier: "handleApplicationInit" });
			toast.error(applicationId ? "Failed to retrieve application" : "Failed to initialize application");
			throw e;
		} finally {
			set({ isLoading: false });
		}
	},
	isLoading: false,

	polling: {
		intervalId: null,
		isActive: false,
		start: (apiFunction: () => Promise<void>, duration: number, callImmediately = true) => {
			const { polling } = get();
			if (polling.isActive || polling.intervalId) {
				return;
			}

			set(({ polling, ...state }) => ({
				...state,
				polling: {
					...polling,
					isActive: true,
				},
			}));

			if (callImmediately) {
				void apiFunction();
			}

			const intervalId = setInterval(() => {
				void apiFunction();
			}, duration);

			set(({ polling, ...state }) => ({
				...state,
				polling: {
					...polling,
					intervalId,
				},
			}));
		},

		stop: () => {
			const { polling } = get();
			if (polling.intervalId) {
				clearInterval(polling.intervalId);
			}

			set(({ polling, ...state }) => ({
				...state,
				polling: {
					...polling,
					intervalId: null,
					isActive: false,
				},
			}));
		},
	},

	removeFile: (fileToRemove: FileWithId) => {
		set(({ contentState, ...state }) => ({
			...state,
			contentState: {
				...contentState,
				uploadedFiles: contentState.uploadedFiles.filter((f) => f.name !== fileToRemove.name),
			},
		}));
	},

	removeUrl: (urlToRemove: string) => {
		set(({ contentState, ...state }) => ({
			...state,
			contentState: {
				...contentState,
				urls: contentState.urls.filter((url) => url !== urlToRemove),
			},
		}));
	},

	retrieveApplication: async () => {
		const {
			applicationState: { applicationId },
			workspaceId,
		} = get();

		if (!workspaceId || !applicationId) {
			return;
		}

		set({ isLoading: true });
		try {
			const response = await retrieveApplication(workspaceId, applicationId);

			set(({ applicationState, ...state }) => ({
				...state,
				applicationState: {
					...applicationState,
					application: response,
					applicationId: response.id,
					templateId: response.grant_template?.id ?? null,
				},
			}));
		} catch (e: unknown) {
			logError({ error: e, identifier: "retrieveApplication" });
			toast.error("Failed to retrieve application");
			throw e;
		} finally {
			set({ isLoading: false });
		}
	},

	setApplication: (application: Exclude<ApplicationType, null>) => {
		set(({ applicationState, ...state }) => ({
			...state,
			applicationState: {
				...applicationState,
				application,
			},
		}));
	},

	setApplicationId: (id: string) => {
		set(({ applicationState, ...state }) => ({
			...state,
			applicationState: {
				...applicationState,
				applicationId: id,
			},
		}));
	},

	setApplicationTitle: (title: string) => {
		const currentState = get();
		const currentTitle = currentState.applicationState.application?.title;

		set(({ applicationState, ...state }) => ({
			...state,
			applicationState: {
				...applicationState,
				applicationTitle: title,
			},
		}));

		const {
			applicationState: { applicationId },
			updateApplicationTitle,
		} = get();
		if (applicationId && title.trim() && title !== currentTitle) {
			const debouncedUpdate = createDebounce(() => {
				void updateApplicationTitle(title);
			}, DEBOUNCE_DELAY_MS);
			debouncedUpdate.call();
		}
	},

	setCurrentStep: (step: number) => {
		set(({ ui, ...state }) => ({
			...state,
			ui: {
				...ui,
				currentStep: Math.max(0, Math.min(WIZARD_STEP_TITLES.length - 1, step)),
			},
		}));
	},

	setFileDropdownOpen: (fileId: string, open: boolean) => {
		set(({ ui, ...state }) => ({
			...state,
			ui: {
				...ui,
				fileDropdownStates: {
					...ui.fileDropdownStates,
					[fileId]: open,
				},
			},
		}));
	},

	setLinkHoverState: (url: string, hovered: boolean) => {
		set(({ ui, ...state }) => ({
			...state,
			ui: {
				...ui,
				linkHoverStates: {
					...ui.linkHoverStates,
					[url]: hovered,
				},
			},
		}));
	},

	setTemplateId: (id: string) => {
		set(({ applicationState, ...state }) => ({
			...state,
			applicationState: {
				...applicationState,
				templateId: id,
			},
		}));
	},

	setUploadedFiles: (files: FileWithId[]) => {
		set(({ contentState, ...state }) => ({
			...state,
			contentState: {
				...contentState,
				uploadedFiles: files,
			},
		}));
	},

	setUrlInput: (input: string) => {
		set(({ ui, ...state }) => ({
			...state,
			ui: { ...ui, urlInput: input },
		}));
	},

	setUrls: (urls: string[]) => {
		set(({ contentState, ...state }) => ({
			...state,
			contentState: {
				...contentState,
				urls,
			},
		}));
	},

	setWorkspaceId: (id: string) => {
		set({ workspaceId: id });
	},

	setWsConnectionStatus: (status?: string) => {
		set(({ applicationState, ...state }) => ({
			...state,
			applicationState: {
				...applicationState,
				wsConnectionStatus: status,
			},
		}));
	},

	setWsConnectionStatusColor: (color?: string) => {
		set(({ applicationState, ...state }) => ({
			...state,
			applicationState: {
				...applicationState,
				wsConnectionStatusColor: color,
			},
		}));
	},

	toNextStep: () => {
		const {
			applicationState: { application },
			ui: { currentStep },
			workspaceId,
		} = get();

		if (currentStep === WIZARD_STEP_TITLES.length - 1) {
			return;
		}

		if (currentStep === 0 && application?.grant_template && !application.grant_template.grant_sections.length) {
			void get().generateTemplate(workspaceId, application.id, application.grant_template.id);
		}
		set(({ ui, ...state }) => ({
			...state,
			ui: {
				...ui,
				currentStep: currentStep + 1,
			},
		}));
	},

	toPreviousStep: () => {
		const {
			ui: { currentStep },
		} = get();

		set(({ ui, ...state }) => ({
			...state,
			ui: {
				...ui,
				currentStep: Math.max(0, currentStep - 1),
			},
		}));
	},

	ui: {
		currentStep: 0,
		fileDropdownStates: {},
		linkHoverStates: {},
		urlInput: "",
	},

	updateApplicationTitle: async (title: string) => {
		const {
			applicationState: { applicationId },
			workspaceId,
		} = get();
		if (!applicationId || !workspaceId) {
			return;
		}

		set({ isLoading: true });
		try {
			await updateApplication(workspaceId, applicationId, {
				title,
			});
		} catch {
			toast.error("Failed to update application title");
		} finally {
			set({ isLoading: false });
		}
	},

	updateGrantSections: async (sections: API.UpdateGrantTemplate.RequestBody["grant_sections"]) => {
		const { applicationState, workspaceId } = get();
		const { application } = applicationState;

		if (!application?.grant_template?.id) {
			return;
		}

		try {
			set({ isLoading: true });

			await updateGrantTemplate(workspaceId, application.id, application.grant_template.id, {
				grant_sections: sections,
			});

			set((state) => ({
				...state,
				applicationState: {
					...state.applicationState,
					application: state.applicationState.application && {
						...state.applicationState.application,
						grant_template: {
							...state.applicationState.application.grant_template!,
							grant_sections: sections,
						},
					},
				},
			}));
		} catch (error) {
			logError({ error, identifier: "Failed to update grant sections" });
			toast.error("Failed to update sections. Please try again.");
		} finally {
			set({ isLoading: false });
		}
	},

	validateStepNext: () => {
		const {
			applicationState: { application, applicationTitle },
			contentState: { uploadedFiles, urls },
			isLoading,
			ui: { currentStep },
		} = get();

		if (!application || isLoading) {
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
				!!application.grant_template?.rag_sources.length &&
				application.grant_template.rag_sources.every((source) => source.status !== "FAILED")
			);
		}
		return false;
	},

	workspaceId: "",
}));
