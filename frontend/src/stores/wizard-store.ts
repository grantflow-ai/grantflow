import { toast } from "sonner";
import { create } from "zustand";

import { createApplication, updateApplication } from "@/actions/grant-applications";
import { FileWithId } from "@/components/workspaces/wizard/application-preview";
import { WIZARD_STEP_TITLES } from "@/constants";

const DEBOUNCE_DELAY_MS = 500;
export const DEFAULT_APPLICATION_TITLE = "Untitled Application";

interface WizardState {
	addFile: (file: FileWithId) => void;
	addUrl: (url: string) => void;
	applicationId: null | string;
	applicationTitle: string;
	currentStep: number;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
	initializeApplication: (workspaceId: string) => Promise<void>;
	isCreatingApplication: boolean;

	isCurrentStepValid: () => boolean;
	isStep1Valid: () => boolean;
	removeFile: (fileToRemove: FileWithId) => void;
	removeUrl: (url: string) => void;
	resetWizard: () => void;
	setApplicationId: (id: string) => void;
	setApplicationTitle: (title: string) => void;
	setCurrentStep: (step: number) => void;
	setFileDropdownOpen: (fileId: string, open: boolean) => void;
	setIsCreatingApplication: (loading: boolean) => void;
	setLinkHoverState: (url: string, hovered: boolean) => void;
	setTemplateId: (id: string) => void;

	setUploadedFiles: (files: FileWithId[]) => void;
	setUrlInput: (input: string) => void;
	setUrls: (urls: string[]) => void;

	setWorkspaceId: (id: string) => void;
	templateId: null | string;

	ui: WizardUI;
	updateApplicationTitle: (title: string) => Promise<void>;

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

export const useWizardStore = create<WizardState>((set, get) => ({
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
	applicationId: null,
	applicationTitle: DEFAULT_APPLICATION_TITLE,
	currentStep: 0,
	goToNextStep: () => {
		const state = get();
		if (state.currentStep === WIZARD_STEP_TITLES.length - 1) {
			return;
		}
		set({ currentStep: state.currentStep + 1 });
	},
	goToPreviousStep: () => {
		const state = get();
		set({ currentStep: Math.max(0, state.currentStep - 1) });
	},
	initializeApplication: async (workspaceId: string) => {
		set({ isCreatingApplication: true, workspaceId });

		const response = await createApplication(workspaceId, {
			title: DEFAULT_APPLICATION_TITLE,
		});

		set({
			applicationId: response.id,
			isCreatingApplication: false,
			templateId: response.template_id,
		});
	},
	isCreatingApplication: true,

	isCurrentStepValid: () => {
		const state = get();
		switch (state.currentStep) {
			case 0: {
				return state.isStep1Valid();
			}
			default: {
				return true;
			}
		}
	},

	isStep1Valid: () => {
		const state = get();
		return state.applicationTitle.trim().length > 0 && (state.urls.length > 0 || state.uploadedFiles.length > 0);
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

	resetWizard: () => {
		if (titleUpdateTimeout) {
			clearTimeout(titleUpdateTimeout);
			titleUpdateTimeout = null;
		}
		set({
			applicationId: null,
			applicationTitle: "",
			currentStep: 0,
			isCreatingApplication: true,
			templateId: null,
			ui: {
				fileDropdownStates: {},
				linkHoverStates: {},
				urlInput: "",
			},
			uploadedFiles: [],
			urls: [],
			workspaceId: "",
		});
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

	workspaceId: "",
}));
