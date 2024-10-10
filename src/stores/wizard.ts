import type { ValueType } from "@/components/wizard/dynamic-forms/form-components";
import { create, UseBoundStore } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Ref } from "@/utils/state";
import { StoreApi } from "zustand/vanilla";
import { type GrantApplicationQuestion, GrantWizardSection } from "@/types/database-types";
import { getBrowserClient } from "@/utils/supabase/client";

const wizardStores = new Ref<Map<string, UseBoundStore<StoreApi<WizardStore>>>>();

const comparator = (a: { ordering: number }, b: { ordering: number }) => a.ordering - b.ordering;

export type WizardStep = "overview" | "researchPlan";

export interface WizardStore {
	cfpIdentifier: string;
	resetStore: () => void;
	// sections
	sections: Record<WizardStep, (GrantWizardSection & { questions: GrantApplicationQuestion[] })[]>;
	setSections: (sections: (GrantWizardSection & { questions: GrantApplicationQuestion[] })[]) => void;
	// wizard step
	currentStep: WizardStep;
	setStep: (step: WizardStep) => void;
	// selected section
	currentSectionIndex: number;
	setSection: (section: number) => void;
	// answers
	answers: Record<
		WizardStep,
		Record<string, { id: string; inputValue?: ValueType; fileIds?: string[]; taskId?: string; researchAimId?: string }>
	>;
	setAnswer: (
		questionId: string,
		value: { inputValue?: ValueType; fileIds?: string[]; taskId?: string; researchAimId?: string },
	) => Promise<Error | null>;
	// progress
	progresses: Record<WizardStep, number>;
	setProgress: (progress: number) => void;
}

const initialState: Pick<WizardStore, "sections" | "currentStep" | "currentSectionIndex" | "answers" | "progresses"> = {
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

/**
 * Create a store for the wizard. The store is persisted in local storage and is specific to a CFP and a draft.
 *
 * @param cfpIdentifier - The identifier of the CFP.
 * @param draftId - The id of the draft.
 */
export function createWizardStore({
	cfpIdentifier,
	draftId,
}: {
	cfpIdentifier: string;
	draftId: string;
}) {
	return create(
		persist<WizardStore>(
			(set, get) => ({
				cfpIdentifier,
				...initialState,
				resetStore: () => {
					set(initialState);
				},
				setSections(sections) {
					const applicationOverviewSections = sections
						.filter((section) => !section.is_research_plan_section)
						.sort(comparator)
						.map((section) => {
							section.questions.sort(comparator);
							return section;
						});
					const researchPlanSections = sections
						.filter((section) => section.is_research_plan_section)
						.sort(comparator)
						.map((section) => {
							section.questions.sort(comparator);
							return section;
						});

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
						draft_id: draftId,
						value: inputValue ?? null,
						file_urls: fileIds,
						task_id: taskId,
						research_aim_id: researchAimId,
					});

					if (error) {
						return new Error(`Failed to save answer for question ${questionId}: ${error.message}`);
					}

					set({
						answers: {
							...state.answers,
							[state.currentStep]: {
								...state.answers[state.currentStep],
								[questionId]: data,
							},
						},
					});

					return null;
				},
				setProgress: (progress) => {
					set((state) => {
						return {
							progresses: {
								...state.progresses,
								[state.currentStep]: progress,
							},
						};
					});
				},
			}),
			{ name: `wizard-store-${cfpIdentifier}-${draftId}`, storage: createJSONStorage(() => localStorage) },
		),
	);
}

/**
 * Get the store for the wizard identified by the given cfpIdentifier and draftId. If the store doesn't exist, it is created.
 *
 * @param cfpIdentifier - The identifier of the CFP.
 * @param draftId - The id of the draft.
 *
 * @returns The store for the wizard.
 */
export function getStore({
	cfpIdentifier,
	draftId,
}: {
	cfpIdentifier: string;
	draftId: string;
}) {
	const id = `${cfpIdentifier}-${draftId}`;
	if (!wizardStores.value) {
		wizardStores.value = new Map();
	}

	let store = wizardStores.value.get(id);
	if (!store) {
		store = createWizardStore({ cfpIdentifier, draftId });
		wizardStores.value.set(draftId, store);
	}

	return store;
}
