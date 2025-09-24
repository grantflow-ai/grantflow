// @ts-nocheck
import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ApplicationWithTemplateFactory, GrantTemplateFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";

import { determineAppropriateStep, useWizardStore } from "./wizard-store";

vi.mock("@/actions/grant-applications", () => ({
	triggerAutofill: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("@/utils/logger/client", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("@/stores/organization-store", () => ({
	useOrganizationStore: {
		getState: vi.fn(() => ({
			clearOrganization: vi.fn(),
			selectedOrganizationId: "mock-org-id",
		})),
		setState: vi.fn(),
	},
}));

describe.sequential("wizard store", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetAllStores();
		setupAuthenticatedTest();
		vi.resetAllMocks();
		vi.resetAllMocks();
	});

	describe("initial state", () => {
		it("should initialize with correct default state", () => {
			const state = useWizardStore.getState();
			expect(state.currentStep).toBe(WizardStep.APPLICATION_DETAILS);
			expect(state.isGeneratingTemplate).toBe(false);
			expect(state.polling.isActive).toBe(false);
		});
	});

	describe("checkTemplateGeneration", () => {
		it("should stop polling when grant sections exist", async () => {
			const mockStop = vi.fn();
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Test Section" }],
				}),
			});

			useApplicationStore.setState({
				application,
				getApplication: vi.fn().mockResolvedValue(undefined),
			});

			useWizardStore.setState({
				polling: { intervalId: null, isActive: true, start: vi.fn(), stop: mockStop },
			});

			await useWizardStore.getState().checkTemplateGeneration();

			expect(mockStop).toHaveBeenCalled();
			expect(useWizardStore.getState().isGeneratingTemplate).toBe(false);
		});

		it("should continue polling when no grant sections", async () => {
			const mockStop = vi.fn();
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
			});

			useApplicationStore.setState({
				application,
				getApplication: vi.fn().mockResolvedValue(undefined),
			});

			useWizardStore.setState({
				polling: { intervalId: null, isActive: true, start: vi.fn(), stop: mockStop },
			});

			await useWizardStore.getState().checkTemplateGeneration();

			expect(mockStop).not.toHaveBeenCalled();
		});
	});

	describe("toNextStep", () => {
		it("should start template generation when entering PREVIEW_AND_APPROVE", () => {
			const mockGenerateTemplate = vi.fn();
			const mockStart = vi.fn();

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					id: "template-id",
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({
				application,
				generateTemplate: mockGenerateTemplate,
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				polling: { intervalId: null, isActive: false, start: mockStart, stop: vi.fn() },
			});

			useWizardStore.getState().toNextStep();

			expect(useWizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_STRUCTURE);
			expect(mockGenerateTemplate).toHaveBeenCalledWith("template-id");
			expect(useWizardStore.getState().isGeneratingTemplate).toBe(true);
			expect(mockStart).toHaveBeenCalled();
		});

		it("should not start generation if grant sections already exist", () => {
			const mockGenerateTemplate = vi.fn();
			const mockStart = vi.fn();

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Test" }],
				}),
			});

			useApplicationStore.setState({
				application,
				generateTemplate: mockGenerateTemplate,
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				polling: { intervalId: null, isActive: false, start: mockStart, stop: vi.fn() },
			});

			useWizardStore.getState().toNextStep();

			expect(mockGenerateTemplate).not.toHaveBeenCalled();
			expect(mockStart).not.toHaveBeenCalled();
		});
	});

	describe("validateStepNext", () => {
		it("should require minimum title length for APPLICATION_DETAILS", () => {
			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_DETAILS });

			const applicationWithShortTitle = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED" }],
				}),
				title: "Short",
			});

			useApplicationStore.setState({ application: applicationWithShortTitle });
			const result = useWizardStore.getState().validateStepNext();
			expect(result.isValid).toBe(false);
			const applicationWithLongTitle = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED" }],
				}),
				title: "This is a longer title that meets requirements",
			});

			useApplicationStore.setState({ application: applicationWithLongTitle });
			const result2 = useWizardStore.getState().validateStepNext();
			expect(result2.isValid).toBe(true);
		});

		it("should require RAG sources to exist for APPLICATION_DETAILS", () => {
			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_DETAILS });

			const applicationWithoutSources = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [],
				}),
				title: "This is a longer title that meets requirements",
			});

			useApplicationStore.setState({ application: applicationWithoutSources });
			const result3 = useWizardStore.getState().validateStepNext();
			expect(result3.isValid).toBe(false);
		});

		it("should require RAG sources to be processed (FINISHED or FAILED) for APPLICATION_DETAILS", () => {
			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_DETAILS });
			const applicationWithCreatedSources = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						{ filename: "test1.pdf", sourceId: "1", status: "CREATED" },
						{ filename: "test2.pdf", sourceId: "2", status: "FINISHED" },
					],
				}),
				title: "This is a longer title that meets requirements",
			});

			useApplicationStore.setState({ application: applicationWithCreatedSources });
			const result4 = useWizardStore.getState().validateStepNext();
			expect(result4.isValid).toBe(false);
			const applicationWithIndexingSources = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						{ filename: "test1.pdf", sourceId: "1", status: "INDEXING" },
						{ filename: "test2.pdf", sourceId: "2", status: "FINISHED" },
					],
				}),
				title: "This is a longer title that meets requirements",
			});

			useApplicationStore.setState({ application: applicationWithIndexingSources });
			const result5 = useWizardStore.getState().validateStepNext();
			expect(result5.isValid).toBe(false);
			const applicationWithFinishedSources = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						{ filename: "test1.pdf", sourceId: "1", status: "FINISHED" },
						{ filename: "test2.pdf", sourceId: "2", status: "FINISHED" },
					],
				}),
				title: "This is a longer title that meets requirements",
			});

			useApplicationStore.setState({ application: applicationWithFinishedSources });
			const result6 = useWizardStore.getState().validateStepNext();
			expect(result6.isValid).toBe(true);
			const applicationWithFailedSources = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						{ filename: "test1.pdf", sourceId: "1", status: "FAILED" },
						{ filename: "test2.pdf", sourceId: "2", status: "FAILED" },
					],
				}),
				title: "This is a longer title that meets requirements",
			});

			useApplicationStore.setState({ application: applicationWithFailedSources });
			const result7 = useWizardStore.getState().validateStepNext();
			expect(result7.isValid).toBe(true);
			const applicationWithMixedSources = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						{ filename: "test1.pdf", sourceId: "1", status: "FINISHED" },
						{ filename: "test2.pdf", sourceId: "2", status: "FAILED" },
					],
				}),
				title: "This is a longer title that meets requirements",
			});

			useApplicationStore.setState({ application: applicationWithMixedSources });
			const result8 = useWizardStore.getState().validateStepNext();
			expect(result8.isValid).toBe(true);
		});

		it("should handle edge cases for APPLICATION_DETAILS validation", () => {
			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_DETAILS });
			const applicationWithoutTemplate = ApplicationWithTemplateFactory.build({
				grant_template: undefined,
				title: "This is a longer title that meets requirements",
			});

			useApplicationStore.setState({ application: applicationWithoutTemplate });
			const result9 = useWizardStore.getState().validateStepNext();
			expect(result9.isValid).toBe(false);
			const applicationWithUndefinedSources = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: undefined,
				}),
				title: "This is a longer title that meets requirements",
			});

			useApplicationStore.setState({ application: applicationWithUndefinedSources });
			const result10 = useWizardStore.getState().validateStepNext();
			expect(result10.isValid).toBe(false);
		});

		it("should require grant sections for APPLICATION_STRUCTURE", () => {
			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_STRUCTURE });
			const applicationWithoutSections = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
			});

			useApplicationStore.setState({ application: applicationWithoutSections });
			const result11 = useWizardStore.getState().validateStepNext();
			expect(result11.isValid).toBe(false);
			const applicationWithSections = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Test Section" }],
				}),
			});

			useApplicationStore.setState({ application: applicationWithSections });
			const result12 = useWizardStore.getState().validateStepNext();
			expect(result12.isValid).toBe(true);
		});
	});

	describe("hasTemplateSourcesWithStatuses", () => {
		it("should return true when template sources match single status", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						{ filename: "doc1.pdf", sourceId: "1", status: "INDEXING" as const },
						{ filename: "doc2.pdf", sourceId: "2", status: "FINISHED" as const },
					],
				}),
			});

			useApplicationStore.setState({ application });

			expect(useWizardStore.getState().hasTemplateSourcesWithStatuses("INDEXING")).toBe(true);
			expect(useWizardStore.getState().hasTemplateSourcesWithStatuses("FINISHED")).toBe(true);
			expect(useWizardStore.getState().hasTemplateSourcesWithStatuses("FAILED")).toBe(false);
		});

		it("should return true when template sources match multiple statuses", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						{ filename: "doc1.pdf", sourceId: "1", status: "FAILED" as const },
						{ filename: "doc2.pdf", sourceId: "2", status: "FINISHED" as const },
					],
				}),
			});

			useApplicationStore.setState({ application });

			expect(useWizardStore.getState().hasTemplateSourcesWithStatuses(["INDEXING", "FAILED", "CREATED"])).toBe(
				true,
			);
			expect(useWizardStore.getState().hasTemplateSourcesWithStatuses(["INDEXING", "CREATED"])).toBe(false);
		});

		it("should return true when template sources are created", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [{ filename: "doc1.pdf", sourceId: "1", status: "CREATED" as const }],
				}),
			});

			useApplicationStore.setState({ application });

			expect(useWizardStore.getState().hasTemplateSourcesWithStatuses(["INDEXING", "FAILED", "CREATED"])).toBe(
				true,
			);
		});

		it("should return false when no template sources match", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						{ filename: "doc1.pdf", sourceId: "1", status: "FINISHED" as const },
						{ filename: "doc2.pdf", sourceId: "2", status: "FINISHED" as const },
					],
				}),
			});

			useApplicationStore.setState({ application });

			expect(useWizardStore.getState().hasTemplateSourcesWithStatuses(["INDEXING", "FAILED", "CREATED"])).toBe(
				false,
			);
		});

		it("should return false when no template sources exist", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({ application });

			expect(useWizardStore.getState().hasTemplateSourcesWithStatuses("INDEXING")).toBe(false);
		});

		it("should return false when no grant template exists", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: undefined,
			});

			useApplicationStore.setState({ application });

			expect(useWizardStore.getState().hasTemplateSourcesWithStatuses("INDEXING")).toBe(false);
		});
	});

	describe("step validation edge cases", () => {
		it("should validate RESEARCH_DEEP_DIVE step with all required fields", () => {
			useWizardStore.setState({ currentStep: WizardStep.RESEARCH_DEEP_DIVE });

			const applicationWithFormInputs = ApplicationWithTemplateFactory.build({
				form_inputs: {
					background_context: "Valid background",
					hypothesis: "Valid hypothesis",
					impact: "Valid impact",
					novelty_and_innovation: "Valid novelty",
					preliminary_data: "Valid preliminary data",
					rationale: "Valid rationale",
					research_feasibility: "Valid feasibility",
					scientific_infrastructure: "Valid infrastructure",
					team_excellence: "Valid team",
				},
			});

			useApplicationStore.setState({ application: applicationWithFormInputs });

			const result13 = useWizardStore.getState().validateStepNext();
			expect(result13.isValid).toBe(true);
		});

		it("should fail RESEARCH_DEEP_DIVE validation with missing fields", () => {
			useWizardStore.setState({ currentStep: WizardStep.RESEARCH_DEEP_DIVE });

			const applicationWithPartialInputs = ApplicationWithTemplateFactory.build({
				form_inputs: {
					background_context: "Valid background",
					hypothesis: "",
					impact: "",
					novelty_and_innovation: "",
					preliminary_data: "",
					rationale: "Valid rationale",
					research_feasibility: "",
					scientific_infrastructure: "",
					team_excellence: "",
				},
			});

			useApplicationStore.setState({ application: applicationWithPartialInputs });

			const result14 = useWizardStore.getState().validateStepNext();
			expect(result14.isValid).toBe(false);
		});

		it("should validate RESEARCH_PLAN step requires objectives with tasks", () => {
			useWizardStore.setState({ currentStep: WizardStep.RESEARCH_PLAN });

			const applicationWithObjectives = ApplicationWithTemplateFactory.build({
				research_objectives: [
					{
						description: "Test Description",
						number: 1,
						research_tasks: [{ description: "Task description", number: 1, title: "Task 1" }],
						title: "Test Objective",
					},
				],
			});

			useApplicationStore.setState({ application: applicationWithObjectives });

			const result15 = useWizardStore.getState().validateStepNext();
			expect(result15.isValid).toBe(true);
		});

		it("should fail RESEARCH_PLAN validation with objectives but no tasks", () => {
			useWizardStore.setState({ currentStep: WizardStep.RESEARCH_PLAN });

			const applicationWithEmptyTasks = ApplicationWithTemplateFactory.build({
				research_objectives: [
					{
						description: "Test Description",
						number: 1,
						research_tasks: [],
						title: "Test Objective",
					},
				],
			});

			useApplicationStore.setState({ application: applicationWithEmptyTasks });

			const result16 = useWizardStore.getState().validateStepNext();
			expect(result16.isValid).toBe(false);
		});
	});

	describe.sequential("polling lifecycle management", () => {
		beforeEach(() => {
			const state = useWizardStore.getState();
			useWizardStore.setState({
				...state,
				polling: {
					...state.polling,
					intervalId: null,
					isActive: false,
				},
			});
		});

		it("should prevent starting polling when already active", () => {
			const mockApiFunction = vi.fn();

			const current = useWizardStore.getState();
			useWizardStore.setState({
				...current,
				polling: {
					...current.polling,
					intervalId: null,
					isActive: true,
				},
			});

			const { polling } = useWizardStore.getState();
			polling.start(mockApiFunction, 1000);

			expect(mockApiFunction).not.toHaveBeenCalled();
		});

		it("should handle start/stop when callImmediately is true", () => {
			const mockApiFunction = vi.fn();

			const { polling } = useWizardStore.getState();
			polling.start(mockApiFunction, 1000, true);
			polling.stop();
			expect(useWizardStore.getState().polling.isActive).toBe(false);
			expect(useWizardStore.getState().polling.intervalId).toBeNull();
		});

		it("should not call API function immediately when callImmediately is false", () => {
			const mockApiFunction = vi.fn();

			const { polling } = useWizardStore.getState();
			polling.start(mockApiFunction, 1000, false);

			expect(mockApiFunction).not.toHaveBeenCalled();
		});

		it("should clear polling state on stop", () => {
			const mockApiFunction = vi.fn();

			const { polling } = useWizardStore.getState();
			polling.start(mockApiFunction, 1000, false);
			polling.stop();
			expect(useWizardStore.getState().polling.isActive).toBe(false);
			expect(useWizardStore.getState().polling.intervalId).toBeNull();
		});
	});

	describe("RAG source polling", () => {
		it("should stop polling when navigating away from APPLICATION_DETAILS", async () => {
			const mockGetApplication = vi.fn().mockResolvedValue(undefined);
			const mockStop = vi.fn();

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "INDEXING" as const }],
				}),
			});

			useApplicationStore.setState({
				application,
				getApplication: mockGetApplication,
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				polling: { intervalId: 123 as any, isActive: true, start: vi.fn(), stop: mockStop },
			});

			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_STRUCTURE });

			await useWizardStore.getState().checkRagSourcesStatus();

			expect(mockStop).toHaveBeenCalled();
			expect(mockGetApplication).not.toHaveBeenCalled();
		});

		it("should stop polling when all sources are processed", async () => {
			const mockGetApplication = vi.fn().mockResolvedValue(undefined);
			const mockStop = vi.fn();

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						{ filename: "test1.pdf", sourceId: "1", status: "FINISHED" as const },
						{ filename: "test2.pdf", sourceId: "2", status: "FAILED" as const },
					],
				}),
			});

			useApplicationStore.setState({
				application,
				getApplication: mockGetApplication,
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				polling: { intervalId: 123 as any, isActive: true, start: vi.fn(), stop: mockStop },
			});

			await useWizardStore.getState().checkRagSourcesStatus();

			useApplicationStore.setState({ application });

			expect(mockStop).toHaveBeenCalled();
		});

		it("should continue polling when sources are still processing", async () => {
			const mockGetApplication = vi.fn().mockResolvedValue(undefined);
			const mockStop = vi.fn();

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						{ filename: "test1.pdf", sourceId: "1", status: "INDEXING" as const },
						{ filename: "test2.pdf", sourceId: "2", status: "FINISHED" as const },
					],
				}),
			});

			useApplicationStore.setState({
				application,
				getApplication: mockGetApplication,
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				polling: { intervalId: 123 as any, isActive: true, start: vi.fn(), stop: mockStop },
			});

			await useWizardStore.getState().checkRagSourcesStatus();

			expect(mockStop).not.toHaveBeenCalled();
			expect(mockGetApplication).toHaveBeenCalled();
		});
	});

	describe("application generation flow", () => {
		it("should skip generation when application already has text", async () => {
			const mockGenerateApplication = vi.fn();
			const applicationWithText = ApplicationWithTemplateFactory.build({
				text: "Existing application text",
			});

			useApplicationStore.setState({
				application: applicationWithText,
				generateApplication: mockGenerateApplication,
			});

			await useWizardStore.getState().generateApplication();

			expect(mockGenerateApplication).not.toHaveBeenCalled();
			expect(useWizardStore.getState().isGeneratingApplication).toBe(false);
		});

		it("should start generation and polling when no text exists", async () => {
			const mockGenerateApplication = vi.fn().mockResolvedValue(true);
			const mockStart = vi.fn();
			const applicationWithoutText = ApplicationWithTemplateFactory.build({
				text: undefined,
			});

			useApplicationStore.setState({
				application: applicationWithoutText,
				generateApplication: mockGenerateApplication,
			});

			useWizardStore.setState({
				polling: {
					intervalId: null,
					isActive: false,
					start: mockStart,
					stop: vi.fn(),
				},
			});

			await useWizardStore.getState().generateApplication();

			expect(mockGenerateApplication).toHaveBeenCalled();
			expect(useWizardStore.getState().isGeneratingApplication).toBe(true);
			expect(mockStart).toHaveBeenCalled();
		});
	});

	describe("step navigation side effects", () => {
		it("should stop polling when leaving APPLICATION_STRUCTURE", () => {
			const mockStop = vi.fn();

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
				isGeneratingTemplate: false,
				polling: {
					intervalId: null,
					isActive: true,
					start: vi.fn(),
					stop: mockStop,
				},
			});

			useWizardStore.getState().toNextStep();

			expect(mockStop).toHaveBeenCalled();
			expect(useWizardStore.getState().isGeneratingTemplate).toBe(false);
		});

		it("should prevent going to previous step during template generation", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
				isGeneratingTemplate: true,
			});

			const initialStep = useWizardStore.getState().currentStep;
			useWizardStore.getState().toPreviousStep();

			expect(useWizardStore.getState().currentStep).toBe(initialStep);
		});

		it("should allow going to previous step when not generating", () => {
			const mockStop = vi.fn();

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
				isGeneratingTemplate: false,
				polling: {
					intervalId: null,
					isActive: true,
					start: vi.fn(),
					stop: mockStop,
				},
			});

			useWizardStore.getState().toPreviousStep();

			expect(useWizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_DETAILS);
			expect(mockStop).toHaveBeenCalled();
		});
	});

	describe("autofill functionality", () => {
		it("should set autofill loading state correctly", () => {
			useWizardStore.getState().setAutofillLoading("research_plan", true);
			expect(useWizardStore.getState().isAutofillLoading.research_plan).toBe(true);
			expect(useWizardStore.getState().isAutofillLoading.research_deep_dive).toBe(false);

			useWizardStore.getState().setAutofillLoading("research_deep_dive", true);
			expect(useWizardStore.getState().isAutofillLoading.research_deep_dive).toBe(true);

			useWizardStore.getState().setAutofillLoading("research_plan", false);
			expect(useWizardStore.getState().isAutofillLoading.research_plan).toBe(false);
		});

		describe("triggerAutofill", () => {
			beforeEach(() => {
				vi.resetModules();
				vi.clearAllMocks();
			});

			it("should not trigger autofill when no application exists", async () => {
				const { triggerAutofill: mockTriggerAutofill } = await import("@/actions/grant-applications");

				useApplicationStore.setState({ application: null });

				await useWizardStore.getState().triggerAutofill("research_plan");

				expect(mockTriggerAutofill).not.toHaveBeenCalled();
			});

			it("should not trigger autofill when documents are still indexing", async () => {
				const { triggerAutofill: mockTriggerAutofill } = await import("@/actions/grant-applications");
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: [
						{ filename: "doc1.pdf", sourceId: "1", status: "INDEXING" as const },
						{ filename: "doc2.pdf", sourceId: "2", status: "FINISHED" as const },
					],
				});

				useApplicationStore.setState({ application });

				await useWizardStore.getState().triggerAutofill("research_plan");

				expect(mockTriggerAutofill).not.toHaveBeenCalled();
				expect(useWizardStore.getState().isAutofillLoading.research_plan).toBe(false);
			});

			it("should not trigger autofill when documents are still being created", async () => {
				const { triggerAutofill: mockTriggerAutofill } = await import("@/actions/grant-applications");
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: [
						{ filename: "doc1.pdf", sourceId: "1", status: "CREATED" as const },
						{ filename: "doc2.pdf", sourceId: "2", status: "FINISHED" as const },
					],
				});

				useApplicationStore.setState({ application });

				await useWizardStore.getState().triggerAutofill("research_plan");

				expect(mockTriggerAutofill).not.toHaveBeenCalled();
				expect(useWizardStore.getState().isAutofillLoading.research_plan).toBe(false);
			});

			it("should allow autofill when all documents have FAILED status", async () => {
				const { triggerAutofill: mockTriggerAutofill } = await import("@/actions/grant-applications");

				vi.mocked(mockTriggerAutofill).mockResolvedValue({
					application_id: "app-123",
					autofill_type: "research_plan",
					message_id: "msg-123",
				});

				const application = ApplicationWithTemplateFactory.build({
					id: "app-123",
					project_id: "proj-123",
					rag_sources: [
						{ filename: "doc1.pdf", sourceId: "1", status: "FAILED" as const },
						{ filename: "doc2.pdf", sourceId: "2", status: "FAILED" as const },
					],
				});

				useApplicationStore.setState({ application });

				await useWizardStore.getState().triggerAutofill("research_plan");

				expect(mockTriggerAutofill).toHaveBeenCalledWith("mock-org-id", "proj-123", "app-123", {
					autofill_type: "research_plan",
				});
			});

			it("should not trigger autofill when no documents are uploaded", async () => {
				const { triggerAutofill: mockTriggerAutofill } = await import("@/actions/grant-applications");
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: [],
				});

				useApplicationStore.setState({ application });

				await useWizardStore.getState().triggerAutofill("research_plan");

				expect(mockTriggerAutofill).not.toHaveBeenCalled();
				expect(useWizardStore.getState().isAutofillLoading.research_plan).toBe(false);
			});

			it("should successfully trigger autofill for research plan with FINISHED documents", async () => {
				const { triggerAutofill: mockTriggerAutofill } = await import("@/actions/grant-applications");

				vi.mocked(mockTriggerAutofill).mockResolvedValue({
					application_id: "app-123",
					autofill_type: "research_plan",
					message_id: "msg-123",
				});

				const application = ApplicationWithTemplateFactory.build({
					id: "app-123",
					project_id: "proj-123",
					rag_sources: [{ filename: "doc1.pdf", sourceId: "1", status: "FINISHED" as const }],
				});

				useApplicationStore.setState({ application });

				expect(useWizardStore.getState().isAutofillLoading.research_plan).toBe(false);

				await useWizardStore.getState().triggerAutofill("research_plan");

				expect(mockTriggerAutofill).toHaveBeenCalledWith("mock-org-id", "proj-123", "app-123", {
					autofill_type: "research_plan",
				});

				expect(useWizardStore.getState().isAutofillLoading.research_plan).toBe(true);
			});

			it("should trigger autofill with field name for research deep dive with FINISHED documents", async () => {
				const { triggerAutofill: mockTriggerAutofill } = await import("@/actions/grant-applications");

				vi.mocked(mockTriggerAutofill).mockResolvedValue({
					application_id: "app-123",
					autofill_type: "research_deep_dive",
					context: "hypothesis",
					message_id: "msg-456",
				});

				const application = ApplicationWithTemplateFactory.build({
					id: "app-123",
					project_id: "proj-123",
					rag_sources: [{ filename: "doc1.pdf", sourceId: "1", status: "FINISHED" as const }],
				});

				useApplicationStore.setState({ application });

				await useWizardStore.getState().triggerAutofill("research_deep_dive", "hypothesis");

				expect(mockTriggerAutofill).toHaveBeenCalledWith("mock-org-id", "proj-123", "app-123", {
					autofill_type: "research_deep_dive",
					context: "hypothesis",
				});
			});

			it("should handle autofill errors gracefully", async () => {
				const { triggerAutofill: mockTriggerAutofill } = await import("@/actions/grant-applications");

				const error = new Error("API Error: Rate limit exceeded");
				vi.mocked(mockTriggerAutofill).mockRejectedValue(error);

				const application = ApplicationWithTemplateFactory.build({
					id: "app-123",
					project_id: "proj-123",
					rag_sources: [{ filename: "doc1.pdf", sourceId: "1", status: "FINISHED" as const }],
				});

				useApplicationStore.setState({ application });

				await useWizardStore.getState().triggerAutofill("research_plan");

				expect(mockTriggerAutofill).toHaveBeenCalledWith("mock-org-id", "proj-123", "app-123", {
					autofill_type: "research_plan",
				});
				expect(useWizardStore.getState().isAutofillLoading.research_plan).toBe(false);
			});

			it("should allow autofill when documents have mixed FINISHED and FAILED status", async () => {
				const { triggerAutofill: mockTriggerAutofill } = await import("@/actions/grant-applications");

				vi.mocked(mockTriggerAutofill).mockResolvedValue({
					application_id: "app-123",
					autofill_type: "research_plan",
					message_id: "msg-123",
				});

				const application = ApplicationWithTemplateFactory.build({
					id: "app-123",
					project_id: "proj-123",
					rag_sources: [
						{ filename: "doc1.pdf", sourceId: "1", status: "FINISHED" as const },
						{ filename: "doc2.pdf", sourceId: "2", status: "FAILED" as const },
					],
				});

				useApplicationStore.setState({ application });

				await useWizardStore.getState().triggerAutofill("research_plan");

				expect(mockTriggerAutofill).toHaveBeenCalledWith("mock-org-id", "proj-123", "app-123", {
					autofill_type: "research_plan",
				});
			});
		});
	});

	describe("determineAppropriateStep", () => {
		it("should return null when application is null", () => {
			useApplicationStore.setState({ application: null });
			const result = determineAppropriateStep("any-id");
			expect(result).toBeNull();
		});

		it("should return null when application ID doesn't match", () => {
			const application = ApplicationWithTemplateFactory.build({ id: "different-id" });
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("requested-id");
			expect(result).toBeNull();
		});

		it("should return GENERATE_AND_COMPLETE when application has text", () => {
			const application = ApplicationWithTemplateFactory.build({
				id: "app-123",
				text: "Some existing application text",
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.GENERATE_AND_COMPLETE);
		});

		it("should return RESEARCH_DEEP_DIVE when form inputs are populated", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: {
					background_context: "Background context filled",
					hypothesis: "Hypothesis filled",
					impact: "",
					novelty_and_innovation: "",
					preliminary_data: "",
					rationale: "Rationale filled",
					research_feasibility: "",
					scientific_infrastructure: "",
					team_excellence: "",
				},
				id: "app-123",
				text: undefined,
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.RESEARCH_DEEP_DIVE);
		});

		it("should return RESEARCH_PLAN when research objectives have tasks", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
				id: "app-123",
				research_objectives: [
					{
						description: "Description 1",
						number: 1,
						research_tasks: [{ description: "Task description", number: 1, title: "Task 1" }],
						title: "Objective 1",
					},
				],
				text: undefined,
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.RESEARCH_PLAN);
		});

		it("should return KNOWLEDGE_BASE when application has rag sources", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
				id: "app-123",
				rag_sources: [{ filename: "test.pdf", sourceId: "source-1", status: "FINISHED" }],
				research_objectives: [],
				text: undefined,
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.KNOWLEDGE_BASE);
		});

		it("should return APPLICATION_STRUCTURE when grant template has sections", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
				id: "app-123",
				rag_sources: [],
				research_objectives: [],
				text: undefined,
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.APPLICATION_STRUCTURE);
		});

		it("should return APPLICATION_DETAILS as fallback", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
				id: "app-123",
				rag_sources: [],
				research_objectives: [],
				text: undefined,
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.APPLICATION_DETAILS);
		});

		it("should prioritize higher steps when multiple conditions are met", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: {
					background_context: "Background context filled",
					hypothesis: "Hypothesis filled",
					impact: "Impact filled",
					novelty_and_innovation: "Innovation filled",
					preliminary_data: "Data filled",
					rationale: "Rationale filled",
					research_feasibility: "Feasibility filled",
					scientific_infrastructure: "Infrastructure filled",
					team_excellence: "Team filled",
				},
				id: "app-123",
				rag_sources: [{ filename: "test.pdf", sourceId: "source-1", status: "FINISHED" }],
				research_objectives: [
					{
						description: "Description 1",
						number: 1,
						research_tasks: [{ description: "Task description", number: 1, title: "Task 1" }],
						title: "Objective 1",
					},
				],
				text: "Application has text",
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.GENERATE_AND_COMPLETE);
		});

		it("should handle empty research objectives array", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
				id: "app-123",
				rag_sources: [],
				research_objectives: [],
				text: undefined,
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.APPLICATION_DETAILS);
		});

		it("should handle research objectives without tasks", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
				id: "app-123",
				rag_sources: [],
				research_objectives: [
					{
						description: "Description 1",
						number: 1,
						research_tasks: [],
						title: "Objective 1",
					},
				],
				text: undefined,
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.APPLICATION_DETAILS);
		});
	});
});
