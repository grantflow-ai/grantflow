import { GrantApplicationAnswer, GrantApplicationQuestion, GrantWizardSection } from "@/types/database-types";
import { getBrowserClient } from "@/utils/supabase/client";
import { create, StoreApi, UseBoundStore } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

export type WizardStep = "overview" | "researchPlan";
export type ValueType = string | number | boolean | null;

export interface WizardStore {
	cfpIdentifier: string;
	draftId: string;
	resetStore: () => void;
	sections: Record<WizardStep, (GrantWizardSection & { questions: GrantApplicationQuestion[] })[]>;
	setSections: (sections: (GrantWizardSection & { questions: GrantApplicationQuestion[] })[]) => void;
	currentStep: WizardStep;
	setStep: (step: WizardStep) => void;
	currentSectionIndex: number;
	setSection: (section: number) => void;
	answers: Record<WizardStep, Record<string, GrantApplicationAnswer>>;
	setAnswer: (
		questionId: string,
		value: {
			inputValue?: ValueType;
			fileIds?: string[];
			taskId?: string;
			researchAimId?: string;
		},
	) => Promise<Error | null>;
	progresses: Record<WizardStep, number>;
	setProgress: (progress: number) => void;
}

const initialState: Omit<
	WizardStore,
	"cfpIdentifier" | "draftId" | "resetStore" | "setSections" | "setStep" | "setSection" | "setAnswer" | "setProgress"
> = {
	sections: {
		overview: [],
		researchPlan: [],
	},
	currentStep: "overview",
	currentSectionIndex: 0,
	answers: {
		overview: {},
		researchPlan: {},
	},
	progresses: {
		overview: 0,
		researchPlan: 0,
	},
};

function createWizardStore({
	draftId,
	cfpIdentifier,
}: {
	draftId: string;
	cfpIdentifier: string;
}): (set: StoreApi<WizardStore>["setState"], get: StoreApi<WizardStore>["getState"]) => WizardStore {
	return (set, get) => ({
		...initialState,
		cfpIdentifier,
		draftId,
		resetStore: () => {
			set(initialState);
		},
		setSections: (sections) => {
			const applicationOverviewSections = sections
				.filter((section) => !section.is_research_plan_section)
				.sort((a, b) => a.ordering - b.ordering)
				.map((section) => ({
					...section,
					questions: section.questions.sort((a, b) => a.ordering - b.ordering),
				}));
			const researchPlanSections = sections
				.filter((section) => section.is_research_plan_section)
				.sort((a, b) => a.ordering - b.ordering)
				.map((section) => ({
					...section,
					questions: section.questions.sort((a, b) => a.ordering - b.ordering),
				}));

			set({
				sections: {
					overview: applicationOverviewSections,
					researchPlan: researchPlanSections,
				},
			});
		},
		setStep: (step) => {
			set({ currentStep: step });
		},
		setSection: (section) => {
			set({ currentSectionIndex: section });
		},
		setAnswer: async (questionId, { inputValue, fileIds, taskId, researchAimId }) => {
			const state = get();
			const question = state.sections[state.currentStep][state.currentSectionIndex].questions.find(
				({ id }) => id === questionId,
			);
			if (!question) {
				return new Error(`Question with id ${questionId} not found`);
			}

			const client = getBrowserClient().from("grant_application_answers");
			const existingAnswer = state.answers[state.currentStep][questionId] as { id: string } | undefined;

			const { data, error } = await client.upsert({
				id: existingAnswer?.id,
				question_id: questionId,
				question_type: question.question_type,
				draft_id: state.draftId,
				value: inputValue ?? null,
				file_urls: fileIds,
				task_id: taskId,
				research_aim_id: researchAimId,
			});

			if (error) {
				return new Error(`Failed to save answer for question ${questionId}: ${error.message}`);
			}

			set((state) => ({
				answers: {
					...state.answers,
					[state.currentStep]: {
						...state.answers[state.currentStep],
						[questionId]: data,
					},
				},
			}));

			return null;
		},
		setProgress: (progress) => {
			set((state) => ({
				progresses: {
					...state.progresses,
					[state.currentStep]: progress,
				},
			}));
		},
	});
}

const stores = new Map<string, UseBoundStore<StoreApi<WizardStore>>>();

export const useWizardStore = ({ cfpIdentifier, draftId }: { cfpIdentifier: string; draftId: string }) => {
	const storeKey = `${cfpIdentifier}-${draftId}`;

	let store = stores.get(storeKey);

	if (!store) {
		store = create(
			devtools(
				persist((set, get) => createWizardStore({ cfpIdentifier, draftId })(set, get), {
					name: `wizard-store-${cfpIdentifier}-${draftId}`,
					storage: createJSONStorage(() => localStorage),
				}),
			),
		);
		stores.set(storeKey, store);
	}

	return store;
};
