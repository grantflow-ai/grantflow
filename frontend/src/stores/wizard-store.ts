import { create } from "zustand";
import { persist } from "zustand/middleware";

import { WIZARD_STEP_TITLES, WIZARD_STORAGE_KEY, WizardStep } from "@/constants";
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
	toNextStep: () => void;
	toPreviousStep: () => void;
	validateStepNext: () => boolean;
}

interface WizardState {
	currentStep: WizardStep;
	polling: PollingState;
}

const initialWizardState: WizardState = {
	currentStep: WizardStep.APPLICATION_DETAILS,
	polling: {
		intervalId: null,
		isActive: false,
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

				toNextStep: () => {
					const { currentStep } = get();

					if (currentStep === WizardStep.GENERATE_AND_COMPLETE) {
						return;
					}

					const { application } = useApplicationStore.getState();

					if (
						currentStep === WizardStep.APPLICATION_DETAILS &&
						application?.grant_template &&
						!application.grant_template.grant_sections.length
					) {
						void useApplicationStore.getState().generateTemplate(application.grant_template.id);
					}

					set((state) => ({
						...state,
						currentStep: WIZARD_STEP_TITLES[WIZARD_STEP_TITLES.indexOf(currentStep) + 1],
					}));
				},

				toPreviousStep: () => {
					const { currentStep } = get();
					const currentIndex = WIZARD_STEP_TITLES.indexOf(currentStep);

					set((state) => ({
						...state,
						currentStep: WIZARD_STEP_TITLES[Math.max(0, currentIndex - 1)],
					}));
				},

				validateStepNext: () => {
					const { currentStep } = get();

					const { application, applicationTitle, isLoading, uploadedFiles, urls } =
						useApplicationStore.getState();

					if (!application || isLoading) {
						return false;
					}

					if (currentStep === WizardStep.APPLICATION_DETAILS) {
						const totalUrls = urls.application.length + urls.template.length;
						const totalFiles = uploadedFiles.application.length + uploadedFiles.template.length;
						return (
							applicationTitle.trim().length >= MIN_TITLE_LENGTH &&
							(totalUrls > 0 || totalFiles > 0)
						);
					}
					if (currentStep === WizardStep.APPLICATION_STRUCTURE) {
						return !!application.grant_template?.grant_sections.length;
					}
					if (currentStep === WizardStep.KNOWLEDGE_BASE) {
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
				currentStep: state.currentStep,
			}),
		},
	),
);
