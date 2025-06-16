import { create } from "zustand";
import { persist } from "zustand/middleware";

import { WIZARD_STEP_TITLES, WIZARD_STORAGE_KEY, WizardStep } from "@/constants";
import { applicationStore } from "@/stores/application-store";
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
	reset: () => void;
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

export const wizardStore = create<WizardActions & WizardState>()(
	persist(
		(set, get) => {
			const debouncedUpdateTitle = createDebounce((title: string) => {
				const { application } = applicationStore.getState();
				if (application?.workspace_id && title.trim() && title !== application.title) {
					void applicationStore
						.getState()
						.updateApplicationTitle(application.workspace_id, application.id, title);
				}
			}, DEBOUNCE_DELAY_MS);

			return {
				...initialWizardState,

				handleTitleChange: (title: string) => {
					applicationStore.getState().setApplicationTitle(title);
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

				reset: () => {
					const currentState = get();
					if (currentState.polling.intervalId) {
						clearInterval(currentState.polling.intervalId);
					}
					set({
						currentStep: initialWizardState.currentStep,
						polling: {
							...currentState.polling,
							...initialWizardState.polling,
						},
					});
				},

				toNextStep: () => {
					const { currentStep } = get();

					if (currentStep === WizardStep.GENERATE_AND_COMPLETE) {
						return;
					}

					const { application } = applicationStore.getState();
					if (
						currentStep === WizardStep.APPLICATION_DETAILS &&
						application?.grant_template &&
						!application.grant_template.grant_sections.length
					) {
						void applicationStore.getState().generateTemplate(application.grant_template.id);
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

				validateStepNext: (): boolean => {
					const { currentStep } = get();
					const { application } = applicationStore.getState();

					switch (currentStep) {
						case WizardStep.APPLICATION_DETAILS: {
							if (!application?.title || application.title.trim().length < MIN_TITLE_LENGTH) {
								return false;
							}
							return true;
						}
						case WizardStep.APPLICATION_STRUCTURE: {
							return true;
						}
						case WizardStep.GENERATE_AND_COMPLETE: {
							return true;
						}
						case WizardStep.KNOWLEDGE_BASE: {
							return true;
						}
						case WizardStep.RESEARCH_DEEP_DIVE: {
							return true;
						}
						case WizardStep.RESEARCH_PLAN: {
							return true;
						}
					}
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
