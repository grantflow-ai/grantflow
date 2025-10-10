import { toast } from "sonner";
import { create } from "zustand";
import { triggerAutofill as triggerAutofillAction } from "@/actions/grant-applications";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import type { API } from "@/types/api-types";
import { hasDetailedResearchPlan } from "@/types/grant-sections";
import type { TemplateEvent } from "@/types/notification-events";
import { createDebounce } from "@/utils/debounce";
import { log } from "@/utils/logger/client";
import { TrackingEvents, trackEvent } from "@/utils/tracking";
import { ApplicationDetailsValidationReason, validateApplicationDetailsStep } from "@/utils/wizard-validation";

const DEBOUNCE_DELAY_MS = 2000;
export const MIN_TITLE_LENGTH = 10;

const WIZARD_STEP_ORDER: WizardStep[] = [
	WizardStep.APPLICATION_DETAILS,
	WizardStep.APPLICATION_STRUCTURE,
	WizardStep.KNOWLEDGE_BASE,
	WizardStep.RESEARCH_PLAN,
	WizardStep.RESEARCH_DEEP_DIVE,
	WizardStep.GENERATE_AND_COMPLETE,
];

export type ResearchObjective = NonNullable<API.UpdateApplication.RequestBody["research_objectives"]>[0];

export interface ValidationResult {
	isValid: boolean;
	metadata?: {
		[key: string]: unknown;
		processingCount?: number;
		totalCount?: number;
	};
	reason: ApplicationDetailsValidationReason | string;
}

type RagSourceStatus = NonNullable<
	API.RetrieveApplication.Http200.ResponseBody["grant_template"]
>["rag_sources"][0]["status"];

interface WizardActions {
	createObjective: (objective: ResearchObjective) => Promise<void>;
	generateApplication: () => Promise<boolean>;
	handleApplicationInit: (projectId: string, applicationId?: string) => Promise<void>;
	handleTitleChange: (title: string) => void;
	hasTemplateSourcesWithStatuses: (statuses: RagSourceStatus | RagSourceStatus[]) => boolean;
	refreshApplicationData: () => Promise<void>;
	removeObjective: (objectiveNumber: number) => Promise<void>;
	reset: () => void;
	resetApplicationGenerationComplete: () => void;
	resetApplicationGenerationFailed: () => void;
	resetTemplateGenerationFailed: () => void;
	setApplicationGenerationFailed: (failed: boolean) => void;
	setAutofillLoading: (type: "research_deep_dive" | "research_plan", isLoading: boolean) => void;

	setGeneratingApplication: (isGenerating: boolean) => void;
	setGeneratingTemplate: (isGenerating: boolean) => void;
	setShowResearchPlanInfoBanner: (show: boolean) => void;
	setTemplateEvent: (event: null | TemplateEvent) => void;
	setTemplateGenerationFailed: (failed: boolean, errorMessage?: string) => void;
	startTemplateGeneration: () => void;
	toNextStep: () => void;
	toPreviousStep: () => void;
	triggerAutofill: (
		type: "research_deep_dive" | "research_plan",
		context?: Record<string, unknown>,
		fieldName?: string,
	) => Promise<void>;
	updateFormInputs: (formInputs: Partial<API.UpdateApplication.RequestBody["form_inputs"]>) => Promise<void>;
	updateObjective: (objectiveNumber: number, updates: Partial<Omit<ResearchObjective, "number">>) => Promise<void>;
	updateObjectives: (objectives: ResearchObjective[]) => Promise<void>;
	updateTasksForObjective: (objectiveNumber: number, tasks: ResearchObjective["research_tasks"]) => Promise<void>;
	validateStepNext: () => ValidationResult;
}

interface WizardState {
	applicationGenerationComplete: boolean;
	applicationGenerationFailed: boolean;
	autofillMessageId: null | string;
	autofillType: "research_deep_dive" | "research_plan" | null;
	currentStep: WizardStep;
	isAutofillLoading: {
		research_deep_dive: boolean;
		research_plan: boolean;
	};
	isGeneratingApplication: boolean;
	isGeneratingTemplate: boolean;
	showResearchPlanInfoBanner: boolean;
	templateEvent: null | TemplateEvent;
	templateGenerationErrorMessage: null | string;
	templateGenerationFailed: boolean;
}

export function determineAppropriateStep(applicationId: string): null | WizardStep {
	const { application } = useApplicationStore.getState();

	if (!application || application.id !== applicationId) {
		return null;
	}

	const hasGrantSections = (application.grant_template?.grant_sections.length ?? 0) > 0;
	if (!hasGrantSections) {
		return WizardStep.APPLICATION_DETAILS;
	}

	const hasRagSources = application.rag_sources.length > 0;
	if (!hasRagSources) {
		return WizardStep.APPLICATION_STRUCTURE;
	}

	const hasObjectivesWithTasks = application.research_objectives?.some((obj) => obj.research_tasks.length > 0);
	if (!hasObjectivesWithTasks) {
		return WizardStep.KNOWLEDGE_BASE;
	}

	const formInputs = application.form_inputs;
	const hasFilledFormInputs =
		formInputs && Object.values(formInputs).some((value) => value && value.trim().length > 0);
	if (!hasFilledFormInputs) {
		return WizardStep.RESEARCH_PLAN;
	}

	const hasApplicationText = application.text && application.text.trim().length > 0;
	if (!hasApplicationText) {
		return WizardStep.RESEARCH_DEEP_DIVE;
	}

	return WizardStep.GENERATE_AND_COMPLETE;
}

const initialWizardState: WizardState = {
	applicationGenerationComplete: false,
	applicationGenerationFailed: false,
	autofillMessageId: null,
	autofillType: null,
	currentStep: WizardStep.APPLICATION_DETAILS,
	isAutofillLoading: {
		research_deep_dive: false,
		research_plan: false,
	},
	isGeneratingApplication: false,
	isGeneratingTemplate: false,
	showResearchPlanInfoBanner: true,
	templateEvent: null,
	templateGenerationErrorMessage: null,
	templateGenerationFailed: false,
};

const debouncedUpdateTitle = createDebounce((title: string) => {
	const { application, updateApplicationTitle } = useApplicationStore.getState();
	const { selectedOrganizationId } = useOrganizationStore.getState();

	if (application?.project_id && title !== application.title && selectedOrganizationId) {
		void updateApplicationTitle(selectedOrganizationId, application.project_id, application.id, title);
	}
}, DEBOUNCE_DELAY_MS);

const getCurrentObjectives = (): ResearchObjective[] => {
	return useApplicationStore.getState().application?.research_objectives ?? [];
};

const updateResearchObjectives = async (updatedObjectives: ResearchObjective[]): Promise<void> => {
	const update: Partial<API.UpdateApplication.RequestBody> = {
		research_objectives: updatedObjectives,
	};

	await useApplicationStore.getState().updateApplication(update);
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

const renumberObjectives = (objectives: ResearchObjective[]): ResearchObjective[] => {
	return objectives.map((obj, index) => ({
		...obj,
		number: index + 1,
	}));
};

const validateAutofillRequirements = (application: API.RetrieveApplication.Http200.ResponseBody | null): boolean => {
	if (!application) {
		log.error("triggerAutofill: No application found");
		return true;
	}

	const hasIndexingInProgress = application.rag_sources.some(
		(source) => source.status === "INDEXING" || source.status === "CREATED",
	);

	if (hasIndexingInProgress) {
		toast.error("Please wait for all documents to finish processing before using autofill");
		return true;
	}

	if (application.rag_sources.length === 0) {
		toast.error("Please upload at least one document before using autofill");
		return true;
	}

	return false;
};

const trackAutofillEvent = async (
	currentStep: WizardStep,
	organizationId: string,
	applicationId: string,
	projectId: string,
	fieldName?: string,
): Promise<void> => {
	if (currentStep === WizardStep.KNOWLEDGE_BASE) {
		await trackEvent(TrackingEvents.WIZARD_STEP_3_AI, {
			aiType: "autofill",
			applicationId,
			fieldName,
			organizationId,
			projectId,
		});
	} else if (currentStep === WizardStep.RESEARCH_DEEP_DIVE) {
		await trackEvent(TrackingEvents.WIZARD_STEP_5_AI, {
			aiType: "autofill",
			applicationId,
			fieldName,
			organizationId,
			projectId,
		});
	}
};

const handleAutofillError = (
	error: unknown,
	type: "research_deep_dive" | "research_plan",
	fieldName?: string,
): void => {
	log.error("triggerAutofill failed", { error, fieldName, type });

	const errorMessage = error instanceof Error ? error.message : "Failed to trigger autofill";
	toast.error(`Autofill error: ${errorMessage}`);

	const state = useWizardStore.getState();
	useWizardStore.setState({
		...state,
		isAutofillLoading: {
			...state.isAutofillLoading,
			[type]: false,
		},
	});
};

function validateApplicationDetails(application: API.RetrieveApplication.Http200.ResponseBody): ValidationResult {
	const ragSources = application.grant_template?.rag_sources ?? [];
	const validation = validateApplicationDetailsStep(application.title, ragSources);

	let reasonMessage: string;
	const metadata: ValidationResult["metadata"] = {};

	switch (validation.reason) {
		case ApplicationDetailsValidationReason.RAG_SOURCES_MISSING: {
			reasonMessage = "No RAG sources (count: 0)";
			break;
		}
		case ApplicationDetailsValidationReason.TITLE_INVALID: {
			reasonMessage = `Title invalid (length: ${application.title ? application.title.length : 0}, min: ${MIN_TITLE_LENGTH})`;
			break;
		}
		case ApplicationDetailsValidationReason.VALID: {
			reasonMessage = "Valid";
			break;
		}
	}

	log.info("[Wizard Store] validateStepNext APPLICATION_DETAILS", {
		hasGrantTemplate: !!application.grant_template,
		ragSourcesCount: ragSources.length,
		ragSourcesStatuses: ragSources.map((s) => s.status),
		reason: reasonMessage,
		result: validation.isValid,
		title: application.title,
		titleLength: application.title ? application.title.length : 0,
	});

	return {
		isValid: validation.isValid,
		metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
		reason: validation.reason,
	};
}

/*
function AdvancedvalidateResearchDeepDive(application: API.RetrieveApplication.Http200.ResponseBody): ValidationResult {
	const formInputs = application.form_inputs;
	if (!formInputs) {
		log.info("[Wizard Store] validateStepNext RESEARCH_DEEP_DIVE", {
			reason: "No form inputs",
			result: false,
		});
		return { isValid: false, reason: "There are no form inputs to validate." };
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

	return { isValid: result, reason: "Not all fields are populated properly." };
}
	*/

function validateResearchDeepDive(): ValidationResult {
	return { isValid: true, reason: "Validation skipped" };
}

function validateResearchPlan(application: API.RetrieveApplication.Http200.ResponseBody): ValidationResult {
	const objectives = application.research_objectives ?? [];
	const result = objectives.some((obj) => obj.research_tasks.length > 0);

	log.info("[Wizard Store] validateStepNext RESEARCH_PLAN", {
		objectivesCount: objectives.length,
		objectivesWithTasks: objectives.filter((obj) => obj.research_tasks.length > 0).length,
		result,
	});

	return { isValid: result, reason: "Some Research objectives do not have tasks." };
}

export const useWizardStore = create<WizardActions & WizardState>()((set, get) => {
	return {
		...initialWizardState,

		createObjective: async (objective: ResearchObjective): Promise<void> => {
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

				const { application } = useApplicationStore.getState();
				const { selectedOrganizationId } = useOrganizationStore.getState();
				if (application && selectedOrganizationId) {
					await trackEvent(TrackingEvents.WIZARD_STEP_4_ADD, {
						applicationId: application.id,
						contentType: "objective",
						fieldName: "research_objective",
						organizationId: selectedOrganizationId,
						projectId: application.project_id,
					});
				}
			}, "Create research objective");
		},

		generateApplication: async (): Promise<boolean> => {
			const { application, generateApplication } = useApplicationStore.getState();

			if (!application) {
				log.error("generateApplication: No application found");
				return false;
			}

			if (application.text && application.text.trim().length > 0) {
				log.info("generateApplication: Application already has text, skipping generation");
				return true;
			}

			try {
				const { selectedOrganizationId } = useOrganizationStore.getState();
				if (!selectedOrganizationId) return false;

				set((state) => ({
					...state,
					applicationGenerationFailed: false,
					isGeneratingApplication: true,
				}));

				const genTriggered = await generateApplication(
					selectedOrganizationId,
					application.project_id,
					application.id,
				);

				if (!genTriggered) {
					log.error(
						"generateApplication",
						"Application generation not triggered due to an error during the API call",
					);
					set((state) => ({
						...state,
						isGeneratingApplication: false,
					}));
					return false;
				}

				log.info("Grant application generation initiated", {
					application_id: application.id,
					project_id: application.project_id,
				});

				return true;
			} catch (error) {
				log.error("generateApplication", error);

				toast.error("Failed to start application generation. Please try again or contact support.");

				set((state) => ({
					...state,
					applicationGenerationFailed: true,
					isGeneratingApplication: false,
				}));
				return false;
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

		refreshApplicationData: async () => {
			const { application } = useApplicationStore.getState();
			if (!application) {
				return;
			}

			const { selectedOrganizationId } = useOrganizationStore.getState();
			if (!selectedOrganizationId) {
				return;
			}

			try {
				await useApplicationStore
					.getState()
					.getApplication(selectedOrganizationId, application.project_id, application.id);
			} catch (error) {
				log.error("refreshApplicationData failed", error);
			}
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
			set({
				applicationGenerationComplete: initialWizardState.applicationGenerationComplete,
				applicationGenerationFailed: initialWizardState.applicationGenerationFailed,
				autofillMessageId: initialWizardState.autofillMessageId,
				autofillType: initialWizardState.autofillType,
				currentStep: initialWizardState.currentStep,
				isAutofillLoading: initialWizardState.isAutofillLoading,
				isGeneratingApplication: initialWizardState.isGeneratingApplication,
				isGeneratingTemplate: initialWizardState.isGeneratingTemplate,
				templateEvent: initialWizardState.templateEvent,
				templateGenerationErrorMessage: initialWizardState.templateGenerationErrorMessage,
				templateGenerationFailed: initialWizardState.templateGenerationFailed,
			});
		},

		resetApplicationGenerationComplete: () => {
			set((state) => ({
				...state,
				applicationGenerationComplete: false,
			}));
		},

		resetApplicationGenerationFailed: () => {
			set((state) => ({
				...state,
				applicationGenerationFailed: false,
			}));
		},

		resetTemplateGenerationFailed: () => {
			set((state) => ({
				...state,
				templateGenerationErrorMessage: null,
				templateGenerationFailed: false,
			}));
		},

		setApplicationGenerationFailed: (failed: boolean) => {
			set((state) => ({
				...state,
				applicationGenerationFailed: failed,
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

		setTemplateEvent: (event: null | TemplateEvent) => {
			set((state) => ({
				...state,
				templateGenerationEvent: event,
			}));
		},

		setTemplateGenerationFailed: (failed: boolean, errorMessage?: string) => {
			set((state) => ({
				...state,
				templateGenerationErrorMessage: errorMessage ?? null,
				templateGenerationFailed: failed,
			}));
		},

		startTemplateGeneration: () => {
			const { application, generateTemplate } = useApplicationStore.getState();

			if (application?.grant_template?.id) {
				void generateTemplate(application.grant_template.id);

				set((state) => ({
					...state,
					isGeneratingTemplate: true,
					templateGenerationFailed: false,
				}));
			}
		},

		toNextStep: () => {
			const { currentStep, hasTemplateSourcesWithStatuses, startTemplateGeneration } = get();

			if (currentStep === WizardStep.GENERATE_AND_COMPLETE) {
				return;
			}

			if (currentStep === WizardStep.APPLICATION_STRUCTURE) {
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
			const { currentStep, isGeneratingTemplate } = get();
			const currentIndex = WIZARD_STEP_ORDER.indexOf(currentStep);

			if (currentStep === WizardStep.APPLICATION_STRUCTURE && isGeneratingTemplate) {
				return;
			}

			if (currentStep === WizardStep.APPLICATION_STRUCTURE) {
				set((state) => ({
					...state,
					isGeneratingTemplate: false,
					templateGenerationErrorMessage: null,
					templateGenerationFailed: false,
				}));
			}

			set((state) => ({
				...state,
				currentStep: WIZARD_STEP_ORDER[Math.max(0, currentIndex - 1)],
			}));
		},

		triggerAutofill: async (
			type: "research_deep_dive" | "research_plan",
			context?: Record<string, unknown>,
			fieldName?: string,
		) => {
			const { application } = useApplicationStore.getState();
			const { selectedOrganizationId } = useOrganizationStore.getState();

			const validationError = validateAutofillRequirements(application);
			if (validationError) return;

			if (!(application && selectedOrganizationId)) return;

			set((state) => ({
				...state,
				isAutofillLoading: {
					...state.isAutofillLoading,
					[type]: true,
				},
			}));

			const payload = {
				autofill_type: type,
				...(fieldName && { field_name: fieldName }),
				...(context && { context }),
			};

			try {
				const response = await triggerAutofillAction(
					selectedOrganizationId,
					application.project_id,
					application.id,
					payload,
				);

				log.info("Autofill triggered successfully", {
					application_id: application.id,
					autofill_type: type,
					field_name: fieldName,
					message_id: response.message_id,
				});

				set((state) => ({
					...state,
					autofillMessageId: response.message_id,
					autofillType: type,
				}));

				await trackAutofillEvent(
					get().currentStep,
					selectedOrganizationId,
					application.id,
					application.project_id,
					fieldName,
				);

				toast.success("Autofill request sent. Processing your documents...");
			} catch (error) {
				handleAutofillError(error, type, fieldName);
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
			updates: Partial<Omit<ResearchObjective, "number">>,
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

		updateObjectives: async (objectives: ResearchObjective[]): Promise<void> => {
			return withErrorHandling(async () => {
				const renumberedObjectives = renumberObjectives(objectives);
				await updateResearchObjectives(renumberedObjectives);
			}, "Update research objectives");
		},

		updateTasksForObjective: async (
			objectiveNumber: number,
			tasks: ResearchObjective["research_tasks"],
		): Promise<void> => {
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

		validateStepNext: (): ValidationResult => {
			const { currentStep } = get();
			const { application } = useApplicationStore.getState();

			if (!application) {
				log.warn("[Wizard Store] validateStepNext: No application", { currentStep });
				return { isValid: false, reason: "application is not yet ready" };
			}

			switch (currentStep) {
				case WizardStep.APPLICATION_DETAILS: {
					return validateApplicationDetails(application);
				}
				case WizardStep.APPLICATION_STRUCTURE: {
					const grantSections = application.grant_template?.grant_sections;
					if (!grantSections?.length) {
						return {
							isValid: false,
							reason: "There are no grant sections.",
						};
					}

					const hasResearchPlan = grantSections.some(
						(section) => hasDetailedResearchPlan(section) && section.is_detailed_research_plan === true,
					);

					if (!hasResearchPlan) {
						return {
							isValid: false,
							reason: "Research plan is missing.",
						};
					}

					return {
						isValid: true,
						reason: "All requirements met.",
					};
				}
				case WizardStep.GENERATE_AND_COMPLETE: {
					return { isValid: true, reason: "No validation needed" };
				}
				case WizardStep.KNOWLEDGE_BASE: {
					return { isValid: !!application.rag_sources.length, reason: "There are no RAG sources." };
				}
				case WizardStep.RESEARCH_DEEP_DIVE: {
					return validateResearchDeepDive();
				}
				case WizardStep.RESEARCH_PLAN: {
					return validateResearchPlan(application);
				}
				default: {
					return { isValid: false, reason: "Invalid step" };
				}
			}
		},
	};
});
