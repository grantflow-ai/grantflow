import type { DragEndEvent } from "@dnd-kit/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { WIZARD_STEP_TITLES, WIZARD_STORAGE_KEY, WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import type { API } from "@/types/api-types";
import { createDebounce } from "@/utils/debounce";

const DEBOUNCE_DELAY_MS = 500;
const POLLING_INTERVAL_DURATION = 3000;
export const MIN_TITLE_LENGTH = 10;

export type Objective = NonNullable<API.RetrieveApplication.Http200.ResponseBody["research_objectives"]>[0];

export const MAX_OBJECTIVES = 5;

export const EXAMPLE_OBJECTIVES = [
	{
		description:
			"Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus vulputate suspendisse enim. Vel cursus ipsum molestie. Aenean ut volutpat nisl enim. Ornare dolor cursus erat. Accumsan tempor vestibulum sapien at velit odio. Aliquam vel ornare pulvinar congue porttitor sed nisl rutrum blandit. Elit magna nulla mauris pharetra ipsum, vitae tincidunt nibh risus erat. Risus odio fermentum suspendisse mauris. Ullamcorper quis nunc mauris pharetra ipsum, vitae tincidunt nibh risus erat. Risus.",
		title: "Dissect principles of the inhibitory crosstalk and signaling in the TME by comprehensive single-cell profiling of the tumor microenvironment and signaling in PD-1+ tumor infiltrating T cells in cancer patients",
	},
	{
		description:
			"Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus vulputate suspendisse enim. Vel cursus ipsum molestie.",
		title: "Optimize therapeutic targeting strategies",
	},
	{
		description:
			"Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus vulputate suspendisse enim.",
		title: "Develop novel biomarker identification methods",
	},
	{
		description:
			"Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus vulputate suspendisse.",
		title: "Analyze immune cell interactions",
	},
	{
		description: "Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus.",
		title: "Investigate resistance mechanisms",
	},
];

interface PollingActions {
	start: (apiFunction: () => Promise<void>, duration: number, callImmediately?: boolean) => void;
	stop: () => void;
}

interface PollingState {
	intervalId: NodeJS.Timeout | null;
	isActive: boolean;
}

interface WizardActions {
	addNextObjective: () => void;
	addObjective: (objective: Objective) => void;
	addTask: (objectiveNumber: number, task: { description?: string; title: string }) => void;
	debouncedRetrieveApplication: () => void;
	handleApplicationInit: (workspaceId: string, applicationId?: string) => Promise<void>;
	handleObjectiveDragEnd: (event: DragEndEvent) => void;
	handleRetrieveWithPolling: () => Promise<void>;
	handleTaskDragEnd: (objectiveNumber: number, event: DragEndEvent) => void;
	handleTitleChange: (title: string) => void;
	polling: PollingActions;
	removeObjective: (objectiveNumber: number) => void;
	removeTask: (objectiveNumber: number, taskNumber: number) => void;
	reorderObjectives: (objectives: Objective[]) => void;
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

export const useWizardStore = create<WizardActions & WizardState>()(
	persist(
		(set, get) => {
			const debouncedUpdateTitle = createDebounce((title: string) => {
				const { application, updateApplicationTitle } = useApplicationStore.getState();
				if (application?.workspace_id && title.trim() && title !== application.title) {
					void updateApplicationTitle(application.workspace_id, application.id, title);
				}
			}, DEBOUNCE_DELAY_MS);

			const debouncedRetrieveApplication = createDebounce(() => {
				void get().handleRetrieveWithPolling();
			}, 1000);

			return {
				...initialWizardState,

				addNextObjective: () => {
					const { application, updateApplication } = useApplicationStore.getState();
					if (!application) return;

					const currentObjectives = application.research_objectives ?? [];
					const currentIndex = currentObjectives.length;
					const exampleObj = EXAMPLE_OBJECTIVES[currentIndex] || EXAMPLE_OBJECTIVES[0];

					const newObjective: Objective = {
						description: exampleObj.description,
						number: currentObjectives.length + 1,
						research_tasks: [],
						title: exampleObj.title,
					};

					void updateApplication({
						research_objectives: [...currentObjectives, newObjective],
					});
				},

				addObjective: (objective: Objective) => {
					const { application, updateApplication } = useApplicationStore.getState();
					if (!application) return;

					const currentObjectives = application.research_objectives ?? [];

					const newObjective = {
						...objective,
						number: currentObjectives.length + 1,
					};

					void updateApplication({
						research_objectives: [...currentObjectives, newObjective],
					});
				},

				addTask: (objectiveNumber: number, task: { description?: string; title: string }) => {
					const { application, updateApplication } = useApplicationStore.getState();
					if (!application) return;

					const objectives = application.research_objectives ?? [];
					const updatedObjectives = objectives.map((obj) => {
						if (obj.number === objectiveNumber) {
							const currentTasks = obj.research_tasks;
							const newTask = {
								description: task.description,
								number: currentTasks.length + 1,
								title: task.title,
							};
							return {
								...obj,
								research_tasks: [...currentTasks, newTask],
							};
						}
						return obj;
					});

					void updateApplication({ research_objectives: updatedObjectives });
				},

				debouncedRetrieveApplication: () => {
					debouncedRetrieveApplication.call();
				},

				handleApplicationInit: async (workspaceId: string, applicationId?: string) => {
					const { createApplication, retrieveApplication } = useApplicationStore.getState();
					await (applicationId
						? retrieveApplication(workspaceId, applicationId)
						: createApplication(workspaceId));
				},

				handleObjectiveDragEnd: (event: DragEndEvent) => {
					const { active, over } = event;
					const { application, updateApplication } = useApplicationStore.getState();

					if (!(application && over) || active.id === over.id) return;

					const objectives = application.research_objectives ?? [];
					const oldIndex = objectives.findIndex((obj) => obj.number === active.id);
					const newIndex = objectives.findIndex((obj) => obj.number === over.id);

					if (oldIndex !== -1 && newIndex !== -1) {
						const reorderedObjectives = [...objectives];
						const [removed] = reorderedObjectives.splice(oldIndex, 1);
						reorderedObjectives.splice(newIndex, 0, removed);

						const updatedObjectives = reorderedObjectives.map((obj, index) => ({
							...obj,
							number: index + 1,
						}));

						void updateApplication({ research_objectives: updatedObjectives });
					}
				},

				handleRetrieveWithPolling: async () => {
					const { getIndexingStatus } = useApplicationStore.getState();
					const { polling } = get();
					const isIndexing = await getIndexingStatus();

					if (isIndexing) {
						polling.start(get().handleRetrieveWithPolling, POLLING_INTERVAL_DURATION, false);
					} else {
						polling.stop();
					}
				},

				handleTaskDragEnd: (objectiveNumber: number, event: DragEndEvent) => {
					const { active, over } = event;
					const { application, updateApplication } = useApplicationStore.getState();

					if (!(application && over) || active.id === over.id) return;

					const objectives = application.research_objectives ?? [];
					const updatedObjectives = objectives.map((obj) => {
						if (obj.number === objectiveNumber) {
							const tasks = obj.research_tasks;
							const oldIndex = tasks.findIndex((task) => task.number === active.id);
							const newIndex = tasks.findIndex((task) => task.number === over.id);

							if (oldIndex !== -1 && newIndex !== -1) {
								const reorderedTasks = [...tasks];
								const [removed] = reorderedTasks.splice(oldIndex, 1);
								reorderedTasks.splice(newIndex, 0, removed);

								const renumberedTasks = reorderedTasks.map((task, index) => ({
									...task,
									number: index + 1,
								}));

								return {
									...obj,
									research_tasks: renumberedTasks,
								};
							}
						}
						return obj;
					});

					void updateApplication({ research_objectives: updatedObjectives });
				},

				handleTitleChange: (title: string) => {
					const { application, updateApplication } = useApplicationStore.getState();
					if (application) {
						void updateApplication({ title });

						debouncedUpdateTitle.call(title);
					}
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

				removeObjective: (objectiveNumber: number) => {
					const { application, updateApplication } = useApplicationStore.getState();
					if (!application) return;

					const objectives = application.research_objectives ?? [];
					const filteredObjectives = objectives.filter((obj) => obj.number !== objectiveNumber);

					const updatedObjectives = filteredObjectives.map((obj, index) => ({
						...obj,
						number: index + 1,
					}));

					void updateApplication({
						research_objectives: updatedObjectives,
					});
				},

				removeTask: (objectiveNumber: number, taskNumber: number) => {
					const { application, updateApplication } = useApplicationStore.getState();
					if (!application) return;

					const objectives = application.research_objectives ?? [];
					const updatedObjectives = objectives.map((obj) => {
						if (obj.number === objectiveNumber) {
							const tasks = obj.research_tasks;
							const filteredTasks = tasks.filter((task) => task.number !== taskNumber);

							const renumberedTasks = filteredTasks.map((task, index) => ({
								...task,
								number: index + 1,
							}));

							return {
								...obj,
								research_tasks: renumberedTasks,
							};
						}
						return obj;
					});

					void updateApplication({ research_objectives: updatedObjectives });
				},

				reorderObjectives: (objectives: Objective[]) => {
					const { application, updateApplication } = useApplicationStore.getState();
					if (!application) return;

					const numberedObjectives = objectives.map((obj, index) => ({
						...obj,
						number: index + 1,
					}));

					void updateApplication({ research_objectives: numberedObjectives });
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

					const { application, generateTemplate } = useApplicationStore.getState();
					if (
						currentStep === WizardStep.APPLICATION_DETAILS &&
						application?.grant_template &&
						!application.grant_template.grant_sections.length
					) {
						void generateTemplate(application.grant_template.id);
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
					const { application, isLoading } = useApplicationStore.getState();

					if (!application || isLoading) {
						return false;
					}

					switch (currentStep) {
						case WizardStep.APPLICATION_DETAILS: {
							if (!application.title || application.title.trim().length < MIN_TITLE_LENGTH) {
								return false;
							}

							const totalSources =
								application.rag_sources.length + (application.grant_template?.rag_sources.length ?? 0);
							return totalSources > 0;
						}
						case WizardStep.APPLICATION_STRUCTURE: {
							return !!application.grant_template?.grant_sections.length;
						}
						case WizardStep.GENERATE_AND_COMPLETE:
						case WizardStep.RESEARCH_DEEP_DIVE:
						case WizardStep.RESEARCH_PLAN: {
							return true;
						}
						case WizardStep.KNOWLEDGE_BASE: {
							return (
								!!application.rag_sources.length &&
								application.rag_sources.every((source) => source.status !== "FAILED")
							);
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
