import type { ValueType } from "@/components/wizard/dynamic-forms/form-components";
import type {
	GrantApplicationAnswer,
	GrantApplicationQuestion,
	GrantWizardSection,
	ResearchAim,
	ResearchTask,
} from "@/types/database-types";
import { getBrowserClient } from "@/utils/supabase/client";
import { type StoreApi, type UseBoundStore, create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

export type WizardStep = "overview" | "researchPlan";
export type WizardSectionWithQuestions = GrantWizardSection & { questions: GrantApplicationQuestion[] };
export type ResearchAimWithTasks = ResearchAim & { tasks: ResearchTask[] };

export interface WizardStore {
	cfpIdentifier: string;
	draftId: string;
	resetStore: () => void;
	// sections
	sections: Record<WizardStep, WizardSectionWithQuestions[]>;
	setSections: (sections: WizardSectionWithQuestions[]) => void;
	// research aims
	researchAims: ResearchAimWithTasks[];
	setResearchAims: (researchAims: ResearchAimWithTasks[]) => void;
	setResearchAim: (
		draftId: string,
		value: {
			title: string;
			description?: string;
			includeClinicalTrials: boolean;
			fileIds?: string[];
		},
	) => Promise<Error | null>;
	setResearchTask: (
		researchAimId: string,
		value: {
			title: string;
			description?: string;
			fileIds?: string[];
		},
	) => Promise<Error | null>;
	// wizard step
	currentWizardStep: WizardStep;
	setWizardStep: (step: WizardStep) => void;
	// selected Section, we use the index of the sorted section which is itself derived from its .ordering attribute
	selectedSection: number;
	setSelectedSection: (sectionIndex: number) => void;
	// answers
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
	setAnswers: (answers: Record<WizardStep, Record<string, GrantApplicationAnswer>>) => void;
	// upload progresses
	progresses: Record<WizardStep, number>;
	setProgress: (progress: number) => void;
}

const initialState: Omit<
	WizardStore,
	| "cfpIdentifier"
	| "draftId"
	| "resetStore"
	| "setAnswer"
	| "setAnswers"
	| "setProgress"
	| "setResearchAim"
	| "setResearchAims"
	| "setResearchTask"
	| "setSections"
	| "setSelectedSection"
	| "setWizardStep"
> = {
	sections: {
		overview: [],
		researchPlan: [],
	},
	researchAims: [],
	currentWizardStep: "overview",
	selectedSection: 0,
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
		setResearchAims: (researchAims) => {
			set({ researchAims });
		},
		setResearchAim: async (draftId, { title, description, includeClinicalTrials, fileIds }) => {
			const client = getBrowserClient().from("research_aims");
			const existingResearchAim = get().researchAims.find((aim) => aim.title === title);
			const { data, error } = await client
				.upsert({
					id: existingResearchAim?.id,
					draft_id: draftId,
					title,
					description,
					include_clinical_trials: includeClinicalTrials,
					file_urls: fileIds,
				})
				.select(`
				*,
				tasks:research_tasks (*)
			`)
				.single();

			if (error) {
				return new Error(`Failed to save research aim: ${error.message}`);
			}

			set((state) => ({
				researchAims: [...state.researchAims.filter((aim) => aim.id !== data.id), data],
			}));

			return null;
		},
		setResearchTask: async (researchAimId, { title, description, fileIds }) => {
			const researchAim = get().researchAims.find((aim) => aim.id === researchAimId);
			if (!researchAim) {
				return new Error(`Research aim with id ${researchAimId} not found`);
			}
			const client = getBrowserClient().from("research_tasks");
			const existingTask = researchAim.tasks.find((task) => task.title === title);

			const { data, error } = await client
				.upsert({
					id: existingTask?.id,
					research_aim_id: researchAimId,
					title,
					description,
					file_urls: fileIds,
				})
				.select("*")
				.single();

			if (error) {
				return new Error(`Failed to save research task: ${error.message}`);
			}

			set((state) => ({
				researchAims: state.researchAims.map((aim) =>
					aim.id === researchAimId
						? { ...aim, tasks: [...aim.tasks.filter((task) => task.id !== data.id), data] }
						: aim,
				),
			}));

			return null;
		},
		setWizardStep: (currentWizardStep) => {
			set({ currentWizardStep });
		},
		setSelectedSection: (selectedSection) => {
			set({ selectedSection });
		},
		setAnswer: async (questionId, { inputValue, fileIds, taskId, researchAimId }) => {
			const state = get();
			const question = state.sections[state.currentWizardStep][state.selectedSection].questions.find(
				({ id }) => id === questionId,
			);
			if (!question) {
				return new Error(`Question with id ${questionId} not found`);
			}

			const client = getBrowserClient().from("grant_application_answers");
			const existingAnswer = state.answers[state.currentWizardStep][questionId] as { id: string } | undefined;

			const { data, error } = await client
				.upsert({
					id: existingAnswer?.id,
					question_id: questionId,
					question_type: question.question_type,
					draft_id: state.draftId,
					value: inputValue ?? null,
					file_urls: fileIds,
					task_id: taskId,
					research_aim_id: researchAimId,
				})
				.select("*")
				.single();

			if (error) {
				return new Error(`Failed to save answer for question ${questionId}: ${error.message}`);
			}

			set((state) => ({
				answers: {
					...state.answers,
					[state.currentWizardStep]: {
						...state.answers[state.currentWizardStep],
						[questionId]: data,
					},
				},
			}));

			return null;
		},
		setAnswers: (answers) => {
			set({ answers });
		},
		setProgress: (progress) => {
			set((state) => ({
				progresses: {
					...state.progresses,
					[state.currentWizardStep]: progress,
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
