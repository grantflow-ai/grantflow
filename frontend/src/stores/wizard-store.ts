import { create } from "zustand";
import { persist } from "zustand/middleware";

import { WIZARD_STEP_TITLES, WIZARD_STORAGE_KEY } from "@/constants";
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
	toNextStep: () => void;
	toPreviousStep: () => void;
	validateStepNext: () => boolean;
}

interface WizardState {
	polling: PollingState;
	ui: WizardUI;
}

interface WizardUI {
	currentStep: number;
	fileDropdownStates: Record<string, boolean>;
	linkHoverStates: Record<string, boolean>;
	urlInput: string;
}

const initialWizardState: WizardState = {
	polling: {
		intervalId: null,
		isActive: false,
	},
	ui: {
		currentStep: 0,
		fileDropdownStates: {},
		linkHoverStates: {},
		urlInput: "",
	},
};

export const useWizardStore = create<WizardActions & WizardState>()(
	persist(
		(set, get) => {
			const debouncedUpdateTitle = createDebounce((title: string) => {
				const { application, updateApplicationTitle } = useApplicationStore.getState();

				if (application?.workspace_id && title.trim() && title !== application.title) {
					void updateApplicationTitle(application.workspace_id, application.id, title);
				}
			}, DEBOUNCE_DELAY_MS);

			return {
				...initialWizardState,

				handleTitleChange: (title: string) => {
					useApplicationStore.getState().setApplicationTitle(title);

					debouncedUpdateTitle.call(title);
				},

				polling: {
					...initialWizardState.polling,
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

				toNextStep: () => {
					const {
						ui: { currentStep },
					} = get();

					if (currentStep === WIZARD_STEP_TITLES.length - 1) {
						return;
					}

					const { application } = useApplicationStore.getState();

					if (
						currentStep === 0 &&
						application?.grant_template &&
						!application.grant_template.grant_sections.length
					) {
						void useApplicationStore.getState().generateTemplate(application.grant_template.id);
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

				validateStepNext: () => {
					const {
						ui: { currentStep },
					} = get();

					const { application, applicationTitle, isLoading, uploadedFiles, urls } =
						useApplicationStore.getState();

					if (!application || isLoading) {
						return false;
					}

					if (currentStep === 0) {
						return (
							applicationTitle.trim().length >= MIN_TITLE_LENGTH &&
							(urls.length > 0 || uploadedFiles.length > 0)
						);
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
			};
		},
		{
			name: WIZARD_STORAGE_KEY,
			partialize: (state) => ({
				ui: {
					currentStep: state.ui.currentStep,
				},
			}),
		},
	),
);
