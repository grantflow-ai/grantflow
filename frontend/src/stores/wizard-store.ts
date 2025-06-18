import { create } from "zustand";

import { WIZARD_STEP_TITLES } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { createDebounce } from "@/utils/debounce";

const DEBOUNCE_DELAY_MS = 500;
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
	handleTitleChange: (title: string) => void;
	polling: PollingActions;
	setCurrentStep: (step: number) => void;
	setFileDropdownOpen: (fileId: string, open: boolean) => void;
	setLinkHoverState: (url: string, hovered: boolean) => void;
	setUrlInput: (input: string) => void;
	setWorkspaceId: (id: string) => void;
	toNextStep: () => void;
	toPreviousStep: () => void;
	validateStepNext: () => boolean;
}

interface WizardState {
	polling: PollingState;
	ui: WizardUI;
	workspaceId: string;
	wsConnectionStatus?: string;
	wsConnectionStatusColor?: string;
}

interface WizardUI {
	currentStep: number;
	fileDropdownStates: Record<string, boolean>;
	linkHoverStates: Record<string, boolean>;
	urlInput: string;
}

export const useWizardStore = create<WizardActions & WizardState>((set, get) => {
	const debouncedUpdateTitle = createDebounce((title: string) => {
		const { workspaceId } = get();
		const { application, updateApplicationTitle } = useApplicationStore.getState();

		if (application && workspaceId && title.trim() && title !== application.title) {
			void updateApplicationTitle(workspaceId, application.id, title);
		}
	}, DEBOUNCE_DELAY_MS);

	return {
		handleTitleChange: (title: string) => {
			// Update local state immediately for responsive UI
			useApplicationStore.getState().setApplicationTitle(title);

			// Debounce the backend update
			debouncedUpdateTitle.call(title);
		},

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

		setUrlInput: (input: string) => {
			set(({ ui, ...state }) => ({
				...state,
				ui: { ...ui, urlInput: input },
			}));
		},

		setWorkspaceId: (id: string) => {
			set({ workspaceId: id });
		},

		toNextStep: () => {
			const {
				ui: { currentStep },
			} = get();

			if (currentStep === WIZARD_STEP_TITLES.length - 1) {
				return;
			}

			const { application, generateTemplate } = useApplicationStore.getState();

			if (currentStep === 0 && application?.grant_template && !application.grant_template.grant_sections.length) {
				void generateTemplate(application.grant_template.id);
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

		validateStepNext: () => {
			const {
				ui: { currentStep },
			} = get();

			const { application, applicationTitle, uploadedFiles, urls } = useApplicationStore.getState();

			if (!application) {
				return false;
			}

			if (currentStep === 0) {
				return (
					applicationTitle.trim().length >= MIN_TITLE_LENGTH && (urls.length > 0 || uploadedFiles.length > 0)
				);
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
		wsConnectionStatus: undefined,
		wsConnectionStatusColor: undefined,
	};
});
