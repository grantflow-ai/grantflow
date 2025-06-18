import { create } from "zustand";
import { persist } from "zustand/middleware";

import { WIZARD_STEP_TITLES, WIZARD_STORAGE_KEY } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";

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
	polling: PollingActions;
	setCurrentStep: (step: number) => void;
	toNextStep: () => void;
	toPreviousStep: () => void;
	validateStepNext: () => boolean;
}

interface WizardState {
	currentStep: number;
	polling: PollingState;
}

const initialWizardState: WizardState = {
	currentStep: 0,
	polling: {
		intervalId: null,
		isActive: false,
	},
};

export const useWizardStore = create<WizardActions & WizardState>()(
	persist(
		(set, get) => ({
			...initialWizardState,

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
				set({ currentStep: Math.max(0, Math.min(WIZARD_STEP_TITLES.length - 1, step)) });
			},

			toNextStep: () => {
				const { currentStep } = get();
				const { application } = useApplicationStore.getState();

				if (currentStep === WIZARD_STEP_TITLES.length - 1) {
					return;
				}

				if (
					currentStep === 0 &&
					application?.grant_template &&
					!application.grant_template.grant_sections.length
				) {
					void useApplicationStore
						.getState()
						.generateTemplate(application.workspace_id, application.id, application.grant_template.id);
				}
				set({ currentStep: currentStep + 1 });
			},

			toPreviousStep: () => {
				const { currentStep } = get();
				set({ currentStep: Math.max(0, currentStep - 1) });
			},

			validateStepNext: () => {
				const { currentStep } = get();
				const { application, isLoading, uploadedFiles, urls } = useApplicationStore.getState();

				if (!application || isLoading) {
					return false;
				}
				if (currentStep === 0) {
					return (
						application.title.trim().length >= MIN_TITLE_LENGTH &&
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
		}),
		{
			name: WIZARD_STORAGE_KEY,
			partialize: (state) => ({ currentStep: state.currentStep }),
		},
	),
);
