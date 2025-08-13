import { create } from "zustand";
import { triggerAutofill as triggerAutofillAction } from "@/actions/grant-applications";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import type { API } from "@/types/api-types";
import { createDebounce } from "@/utils/debounce";
import { log } from "@/utils/logger/client";

const DEBOUNCE_DELAY_MS = 2000;
const POLLING_INTERVAL_DURATION = 2000;
export const MIN_TITLE_LENGTH = 10;

const WIZARD_STEP_ORDER: WizardStep[] = [
	WizardStep.APPLICATION_DETAILS,
	WizardStep.APPLICATION_STRUCTURE,
	WizardStep.KNOWLEDGE_BASE,
	WizardStep.RESEARCH_PLAN,
	WizardStep.RESEARCH_DEEP_DIVE,
	WizardStep.GENERATE_AND_COMPLETE,
];

export type Objective = NonNullable<API.RetrieveApplication.Http200.ResponseBody["research_objectives"]>[0];

export type TemplateGenerationEvent =
	| "cfp_data_extracted"
	| "extracting_cfp_data"
	| "generation_error"
	| "grant_template_created"
	| "grant_template_extraction"
	| "grant_template_generation_started"
	| "grant_template_metadata"
	| "indexing_in_progress"
	| "insufficient_context_error"
	| "internal_error"
	| "low_retrieval_quality"
	| "metadata_generated"
	| "pipeline_error"
	| "saving_grant_template"
	| "sections_extracted";

export interface TemplateGenerationStatus {
	event: TemplateGenerationEvent;
	message: string;
}

interface PollingActions {
	start: (apiFunction: () => Promise<void>, duration: number, callImmediately?: boolean) => void;
	stop: () => void;
}

interface PollingState {
	intervalId: NodeJS.Timeout | null;
	isActive: boolean;
}

type RagSourceStatus = NonNullable<
	API.RetrieveApplication.Http200.ResponseBody["grant_template"]
>["rag_sources"][0]["status"];

interface WizardActions {
	checkApplicationGeneration: () => Promise<void>;
	checkTemplateGeneration: () => Promise<void>;
	createObjective: (objective: Objective) => Promise<void>;
	generateApplication: () => Promise<void>;
	handleApplicationInit: (projectId: string, applicationId?: string) => Promise<void>;
	handleTitleChange: (title: string) => void;
	hasTemplateSourcesWithStatuses: (statuses: RagSourceStatus | RagSourceStatus[]) => boolean;
	polling: PollingActions;
	removeObjective: (objectiveNumber: number) => Promise<void>;
	reset: () => void;
	resetApplicationGenerationComplete: () => void;
	setAutofillLoading: (type: "research_deep_dive" | "research_plan", isLoading: boolean) => void;

	setGeneratingApplication: (isGenerating: boolean) => void;
	setGeneratingTemplate: (isGenerating: boolean) => void;
	setShowResearchPlanInfoBanner: (show: boolean) => void;
	setTemplateGenerationStatus: (status: null | TemplateGenerationStatus) => void;
	startTemplateGeneration: () => void;

	toNextStep: () => void;
	toPreviousStep: () => void;
	triggerAutofill: (type: "research_deep_dive" | "research_plan", fieldName?: string) => Promise<void>;

	updateFormInputs: (formInputs: Partial<API.UpdateApplication.RequestBody["form_inputs"]>) => Promise<void>;
	updateObjective: (objectiveNumber: number, updates: Partial<Omit<Objective, "number">>) => Promise<void>;
	updateObjectives: (objectives: Objective[]) => Promise<void>;
	updateTasksForObjective: (objectiveNumber: number, tasks: Objective["research_tasks"]) => Promise<void>;
	validateStepNext: () => boolean;
}

interface WizardState {
	applicationGenerationComplete: boolean;
	currentStep: WizardStep;
	isAutofillLoading: {
		research_deep_dive: boolean;
		research_plan: boolean;
	};
	isGeneratingApplication: boolean;
	isGeneratingTemplate: boolean;
	polling: PollingState;
	showResearchPlanInfoBanner: boolean;
	templateGenerationStatus: null | TemplateGenerationStatus;
}

const initialWizardState: WizardState = {
	applicationGenerationComplete: false,
	currentStep: WizardStep.APPLICATION_DETAILS,
	isAutofillLoading: {
		research_deep_dive: false,
		research_plan: false,
	},
	isGeneratingApplication: false,
	isGeneratingTemplate: false,
	polling: {
		intervalId: null,
		isActive: false,
	},
	showResearchPlanInfoBanner: true,
	templateGenerationStatus: null,
};

const debouncedUpdateTitle = createDebounce((title: string) => {
	const { application, updateApplicationTitle } = useApplicationStore.getState();
	const { selectedOrganizationId } = useOrganizationStore.getState();

	if (application?.project_id && title !== application.title && selectedOrganizationId) {
		void updateApplicationTitle(selectedOrganizationId, application.project_id, application.id, title);
	}
}, DEBOUNCE_DELAY_MS);

const getCurrentObjectives = (): Objective[] => {
	return useApplicationStore.getState().application?.research_objectives ?? [];
};

const updateResearchObjectives = async (updatedObjectives: Objective[]): Promise<void> => {
	const partialUpdate: Partial<API.UpdateApplication.RequestBody> = {
		research_objectives: updatedObjectives,
	};

	await useApplicationStore.getState().updateApplication(partialUpdate);
};

const withErrorHandling = async <T>(operation: () => Promise<T>, errorMessage: string): Promise<T> => {
	try {
		return await operation();
	} catch (error) {
		log.error("Research objectives operation failed", {
			error,
			operation: errorMessage,
		});

		throw error;
	}
};

const renumberObjectives = (objectives: Objective[]): Objective[] => {
	return objectives.map((obj, index) => ({
		...obj,
		number: index + 1,
	}));
};

// Helper functions to reduce validateStepNext complexity
function validateApplicationDetails(application: API.RetrieveApplication.Http200.ResponseBody): boolean {
	const titleValid = !!(application.title && application.title.trim().length >= MIN_TITLE_LENGTH);
	const ragSourcesCount = application.grant_template?.rag_sources.length ?? 0;
	const ragSourcesValid = ragSourcesCount > 0;
	const result = titleValid && ragSourcesValid;

	const titleLength = application.title ? application.title.length : 0;

	let reason: string;
	if (!titleValid) {
		reason = `Title invalid (length: ${titleLength}, min: ${MIN_TITLE_LENGTH})`;
	} else if (ragSourcesValid) {
		reason = "Valid";
	} else {
		reason = `No RAG sources (count: ${ragSourcesCount})`;
	}

	log.info("[Wizard Store] validateStepNext APPLICATION_DETAILS", {
		hasGrantTemplate: !!application.grant_template,
		ragSourcesCount,
		reason,
		result,
		title: application.title,
		titleLength,
	});

	return result;
}

function validateResearchDeepDive(application: API.RetrieveApplication.Http200.ResponseBody): boolean {
	const formInputs = application.form_inputs;
	if (!formInputs) {
		log.info("[Wizard Store] validateStepNext RESEARCH_DEEP_DIVE", {
			reason: "No form inputs",
			result: false,
		});
		return false;
	}

	const requiredFields = [
		"background_context",
		"hypothesis",
		"rationale",
		"novelty_and_innovation",
		"impact",
		"team_excellence",
		"research_feasibility",
		"preliminary_data",
	] as const;

	const fieldStatus = requiredFields.map((field) => {
		const value = formInputs[field];
		const valid = Boolean(value && value.trim().length > 0);
		return { field, length: value ? value.length : 0, valid };
	});

	const result = fieldStatus.every((status) => status.valid);

	log.info("[Wizard Store] validateStepNext RESEARCH_DEEP_DIVE", {
		fieldStatus,
		filledFields: fieldStatus.filter((s) => s.valid).length,
		result,
		totalFields: requiredFields.length,
	});

	return result;
}

function validateResearchPlan(application: API.RetrieveApplication.Http200.ResponseBody): boolean {
	const objectives = application.research_objectives ?? [];
	const result = objectives.some((obj) => obj.research_tasks.length > 0);

	log.info("[Wizard Store] validateStepNext RESEARCH_PLAN", {
		objectivesCount: objectives.length,
		objectivesWithTasks: objectives.filter((obj) => obj.research_tasks.length > 0).length,
		result,
	});

	return result;
}

export const useWizardStore = create<WizardActions & WizardState>()((set, get) => {
	return {
		...initialWizardState,

		checkApplicationGeneration: async () => {
			const { application, getApplication } = useApplicationStore.getState();
			const { polling } = get();

			if (!application) {
				return;
			}

			try {
				const { selectedOrganizationId } = useOrganizationStore.getState();
				if (!selectedOrganizationId) return;

				await getApplication(selectedOrganizationId, application.project_id, application.id);

				const { application: updatedApplication } = useApplicationStore.getState();

				if (updatedApplication?.text && updatedApplication.text.trim().length > 0) {
					polling.stop();
					set((state) => ({
						...state,
						applicationGenerationComplete: true,
						isGeneratingApplication: false,
					}));
					return;
				}
			} catch (error) {
				log.error("checkApplicationGeneration", error);
				polling.stop();
				set((state) => ({
					...state,
					isGeneratingApplication: false,
				}));
			}
		},

		checkTemplateGeneration: async () => {
			const { application, getApplication } = useApplicationStore.getState();
			const { polling } = get();

			if (!application) {
				return;
			}

			try {
				const { selectedOrganizationId } = useOrganizationStore.getState();
				if (!selectedOrganizationId) return;

				await getApplication(selectedOrganizationId, application.project_id, application.id);

				const { application: updatedApplication } = useApplicationStore.getState();

				if (updatedApplication?.grant_template?.grant_sections.length) {
					polling.stop();
					set((state) => ({
						...state,
						isGeneratingTemplate: false,
					}));
					return;
				}
			} catch (error) {
				log.error("checkTemplateGeneration", error);
				polling.stop();
				set((state) => ({
					...state,
					isGeneratingTemplate: false,
				}));
			}
		},

		createObjective: async (objective: Objective): Promise<void> => {
			return withErrorHandling(async () => {
				if (!objective.title.trim()) {
					throw new Error("Title is required");
				}
				if (!objective.description?.trim()) {
					throw new Error("Description is required");
				}
				if (!objective.research_tasks.length) {
					throw new Error("At least one task is required");
				}

				const currentObjectives = getCurrentObjectives();
				const updatedObjectives = [...currentObjectives, objective];
				await updateResearchObjectives(updatedObjectives);
			}, "Create research objective");
		},

		generateApplication: async () => {
			const { application, generateApplication } = useApplicationStore.getState();
			const { polling } = get();

			if (!application) {
				log.error("generateApplication: No application found");
				return;
			}

			if (application.text && application.text.trim().length > 0) {
				log.info("generateApplication: Application already has text, skipping generation");
				return;
			}

			try {
				const { selectedOrganizationId } = useOrganizationStore.getState();
				if (!selectedOrganizationId) return;

				await generateApplication(selectedOrganizationId, application.project_id, application.id);

				set((state) => ({
					...state,
					isGeneratingApplication: true,
				}));

				polling.start(get().checkApplicationGeneration, POLLING_INTERVAL_DURATION, false);

				log.info("Grant application generation initiated", {
					application_id: application.id,
					project_id: application.project_id,
				});
			} catch (error) {
				log.error("generateApplication", error);
				set((state) => ({
					...state,
					isGeneratingApplication: false,
				}));
			}
		},

		handleApplicationInit: async (projectId: string, applicationId?: string) => {
			const { createApplication, getApplication } = useApplicationStore.getState();
			const { selectedOrganizationId } = useOrganizationStore.getState();
			if (!selectedOrganizationId) return;

			await (applicationId
				? getApplication(selectedOrganizationId, projectId, applicationId)
				: createApplication(selectedOrganizationId, projectId));
		},

		handleTitleChange: (title: string) => {
			const { application } = useApplicationStore.getState();

			if (application) {
				debouncedUpdateTitle.call(title);
			}
		},

		hasTemplateSourcesWithStatuses: (statuses: RagSourceStatus | RagSourceStatus[]) => {
			const { application } = useApplicationStore.getState();

			if (!application?.grant_template?.rag_sources) {
				return false;
			}

			const statusArray = Array.isArray(statuses) ? statuses : [statuses];
			return application.grant_template.rag_sources.some((source) => statusArray.includes(source.status));
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
						isActive: true,
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

		removeObjective: async (objectiveNumber: number): Promise<void> => {
			return withErrorHandling(async () => {
				const currentObjectives = getCurrentObjectives();
				const filteredObjectives = currentObjectives.filter((obj) => obj.number !== objectiveNumber);

				const renumberedObjectives = renumberObjectives(filteredObjectives);
				await updateResearchObjectives(renumberedObjectives);
			}, "Remove research objective");
		},

		reset: () => {
			const currentState = get();
			if (currentState.polling.intervalId) {
				clearInterval(currentState.polling.intervalId);
			}
			set({
				applicationGenerationComplete: initialWizardState.applicationGenerationComplete,
				currentStep: initialWizardState.currentStep,
				isAutofillLoading: initialWizardState.isAutofillLoading,
				isGeneratingApplication: initialWizardState.isGeneratingApplication,
				isGeneratingTemplate: initialWizardState.isGeneratingTemplate,
				polling: {
					...currentState.polling,
					...initialWizardState.polling,
				},
				templateGenerationStatus: initialWizardState.templateGenerationStatus,
			});
		},

		resetApplicationGenerationComplete: () => {
			set((state) => ({
				...state,
				applicationGenerationComplete: false,
			}));
		},

		setAutofillLoading: (type: "research_deep_dive" | "research_plan", isLoading: boolean) => {
			set((state) => ({
				...state,
				isAutofillLoading: {
					...state.isAutofillLoading,
					[type]: isLoading,
				},
			}));
		},

		setGeneratingApplication: (isGenerating: boolean) => {
			set((state) => ({
				...state,
				isGeneratingApplication: isGenerating,
			}));
		},

		setGeneratingTemplate: (isGenerating: boolean) => {
			set((state) => ({
				...state,
				isGeneratingTemplate: isGenerating,
			}));
		},

		setShowResearchPlanInfoBanner: (show: boolean) => {
			set((state) => ({
				...state,
				showResearchPlanInfoBanner: show,
			}));
		},

		setTemplateGenerationStatus: (status: null | TemplateGenerationStatus) => {
			set((state) => ({
				...state,
				templateGenerationStatus: status,
			}));
		},

		startTemplateGeneration: () => {
			const { application, generateTemplate } = useApplicationStore.getState();
			const { polling } = get();

			if (application?.grant_template?.id) {
				void generateTemplate(application.grant_template.id);

				set((state) => ({
					...state,
					isGeneratingTemplate: true,
				}));

				polling.start(get().checkTemplateGeneration, POLLING_INTERVAL_DURATION, false);
			}
		},

		toNextStep: () => {
			const { currentStep, hasTemplateSourcesWithStatuses, polling, startTemplateGeneration } = get();

			if (currentStep === WizardStep.GENERATE_AND_COMPLETE) {
				return;
			}

			if (currentStep === WizardStep.APPLICATION_STRUCTURE) {
				polling.stop();
				set((state) => ({
					...state,
					isGeneratingTemplate: false,
				}));
			}

			const nextStep = WIZARD_STEP_ORDER[WIZARD_STEP_ORDER.indexOf(currentStep) + 1];

			set((state) => ({
				...state,
				currentStep: nextStep,
			}));

			const { application } = useApplicationStore.getState();
			if (
				nextStep === WizardStep.APPLICATION_STRUCTURE &&
				application?.grant_template &&
				!application.grant_template.grant_sections.length
			) {
				const ragSources = application.grant_template.rag_sources;

				if (ragSources.length === 0 || !hasTemplateSourcesWithStatuses(["CREATED", "INDEXING", "FAILED"])) {
					startTemplateGeneration();
				}
			}
		},

		toPreviousStep: () => {
			const { currentStep, isGeneratingTemplate, polling } = get();
			const currentIndex = WIZARD_STEP_ORDER.indexOf(currentStep);

			if (currentStep === WizardStep.APPLICATION_STRUCTURE && isGeneratingTemplate) {
				return;
			}

			if (currentStep === WizardStep.APPLICATION_STRUCTURE) {
				polling.stop();
				set((state) => ({
					...state,
					isGeneratingTemplate: false,
				}));
			}

			set((state) => ({
				...state,
				currentStep: WIZARD_STEP_ORDER[Math.max(0, currentIndex - 1)],
			}));
		},

		triggerAutofill: async (type: "research_deep_dive" | "research_plan", fieldName?: string) => {
			const { application } = useApplicationStore.getState();

			if (!application) {
				log.error("triggerAutofill: No application found");
				return;
			}

			const hasIndexingInProgress = application.rag_sources.some(
				(source) => source.status === "INDEXING" || source.status === "CREATED",
			);

			if (hasIndexingInProgress) {
				const { toast } = await import("sonner");
				toast.error("Please wait for all documents to finish processing before using autofill");
				return;
			}

			if (application.rag_sources.length === 0) {
				const { toast } = await import("sonner");
				toast.error("Please upload at least one document before using autofill");
				return;
			}

			try {
				set((state) => ({
					...state,
					isAutofillLoading: {
						...state.isAutofillLoading,
						[type]: true,
					},
				}));

				const { selectedOrganizationId } = useOrganizationStore.getState();
				if (!selectedOrganizationId) return;

				const response = await triggerAutofillAction(
					selectedOrganizationId,
					application.project_id,
					application.id,
					{
						autofill_type: type,
						...(fieldName && { field_name: fieldName }),
					},
				);

				log.info("Autofill triggered successfully", {
					application_id: application.id,
					autofill_type: type,
					field_name: fieldName,
					message_id: response.message_id,
				});

				const { toast } = await import("sonner");
				toast.success("Autofill request sent. Processing your documents...");
			} catch (error) {
				log.error("triggerAutofill failed", { error, fieldName, type });

				const { toast } = await import("sonner");
				const errorMessage = error instanceof Error ? error.message : "Failed to trigger autofill";
				toast.error(`Autofill error: ${errorMessage}`);

				set((state) => ({
					...state,
					isAutofillLoading: {
						...state.isAutofillLoading,
						[type]: false,
					},
				}));
			}
		},

		updateFormInputs: async (formInputs: Partial<API.UpdateApplication.RequestBody["form_inputs"]>) => {
			const { application, updateApplication } = useApplicationStore.getState();

			if (!application) {
				log.error("updateFormInputs: No application found");
				return;
			}

			const currentFormInputs = application.form_inputs ?? {};
			const mergedFormInputs = { ...currentFormInputs, ...formInputs };

			await updateApplication({
				form_inputs: mergedFormInputs as API.UpdateApplication.RequestBody["form_inputs"],
			});
		},

		updateObjective: async (
			objectiveNumber: number,
			updates: Partial<Omit<Objective, "number">>,
		): Promise<void> => {
			return withErrorHandling(async () => {
				const currentObjectives = getCurrentObjectives();
				const targetObjective = currentObjectives.find((obj) => obj.number === objectiveNumber);

				if (!targetObjective) {
					throw new Error(`Objective with number ${objectiveNumber} not found`);
				}

				const updatedObjectives = currentObjectives.map((obj) => {
					if (obj.number === objectiveNumber) {
						return {
							...obj,
							...updates,
						};
					}
					return obj;
				});

				await updateResearchObjectives(updatedObjectives);
			}, "Update research objective");
		},

		updateObjectives: async (objectives: Objective[]): Promise<void> => {
			return withErrorHandling(async () => {
				const renumberedObjectives = renumberObjectives(objectives);
				await updateResearchObjectives(renumberedObjectives);
			}, "Update research objectives");
		},

		updateTasksForObjective: async (objectiveNumber: number, tasks: Objective["research_tasks"]): Promise<void> => {
			return withErrorHandling(async () => {
				const currentObjectives = getCurrentObjectives();
				const targetObjective = currentObjectives.find((obj) => obj.number === objectiveNumber);

				if (!targetObjective) {
					throw new Error(`Objective with number ${objectiveNumber} not found`);
				}

				const renumberedTasks = tasks.map((task, index) => ({
					...task,
					number: index + 1,
				}));

				const updatedObjectives = currentObjectives.map((obj) => {
					if (obj.number === objectiveNumber) {
						return {
							...obj,
							research_tasks: renumberedTasks,
						};
					}
					return obj;
				});

				await updateResearchObjectives(updatedObjectives);
			}, "Update tasks for research objective");
		},

		validateStepNext: (): boolean => {
			const { currentStep } = get();
			const { application } = useApplicationStore.getState();

			if (!application) {
				log.warn("[Wizard Store] validateStepNext: No application", { currentStep });
				return false;
			}

			switch (currentStep) {
				case WizardStep.APPLICATION_DETAILS: {
					return validateApplicationDetails(application);
				}
				case WizardStep.APPLICATION_STRUCTURE: {
					return !!application.grant_template?.grant_sections.length;
				}
				case WizardStep.GENERATE_AND_COMPLETE: {
					return true;
				}
				case WizardStep.KNOWLEDGE_BASE: {
					return !!application.rag_sources.length;
				}
				case WizardStep.RESEARCH_DEEP_DIVE: {
					return validateResearchDeepDive(application);
				}
				case WizardStep.RESEARCH_PLAN: {
					return validateResearchPlan(application);
				}
				default: {
					return false;
				}
			}
		},
	};
});
