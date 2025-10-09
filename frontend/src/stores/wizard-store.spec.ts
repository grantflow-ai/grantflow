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
			expect(state.templateGenerationFailed).toBe(false);
			expect(state.templateGenerationErrorMessage).toBe(null);
		});
	});

	describe("template generation state", () => {
		it("should set template generation failed with error message", () => {
			useWizardStore.getState().setTemplateGenerationFailed(true, "Test error message");

			expect(useWizardStore.getState().templateGenerationFailed).toBe(true);
			expect(useWizardStore.getState().templateGenerationErrorMessage).toBe("Test error message");
		});

		it("should reset template generation failed state", () => {
			useWizardStore.setState({
				templateGenerationErrorMessage: "Some error",
				templateGenerationFailed: true,
			});

			useWizardStore.getState().resetTemplateGenerationFailed();

			expect(useWizardStore.getState().templateGenerationFailed).toBe(false);
			expect(useWizardStore.getState().templateGenerationErrorMessage).toBe(null);
		});
	});

	describe("toNextStep", () => {
		it("should start template generation when entering APPLICATION_STRUCTURE", () => {
			const mockGenerateTemplate = vi.fn();

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
			});

			useWizardStore.getState().toNextStep();

			expect(useWizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_STRUCTURE);
			expect(mockGenerateTemplate).toHaveBeenCalledWith("template-id");
			expect(useWizardStore.getState().isGeneratingTemplate).toBe(true);
		});

		it("should not start generation if grant sections already exist", () => {
			const mockGenerateTemplate = vi.fn();

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
			});

			useWizardStore.getState().toNextStep();

			expect(mockGenerateTemplate).not.toHaveBeenCalled();
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

		it("should allow proceeding regardless of RAG source processing status for APPLICATION_DETAILS", () => {
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
			expect(result4.isValid).toBe(true);
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
			expect(result5.isValid).toBe(true);
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
			expect(result11.reason).toBe("There are no grant sections.");

			const applicationWithSectionsNoResearchPlan = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [
						{ id: "1", is_detailed_research_plan: false, order: 0, parent_id: null, title: "Test Section" },
						{
							id: "2",
							is_detailed_research_plan: false,
							order: 1,
							parent_id: null,
							title: "Another Section",
						},
					],
				}),
			});

			useApplicationStore.setState({ application: applicationWithSectionsNoResearchPlan });
			const result13 = useWizardStore.getState().validateStepNext();
			expect(result13.isValid).toBe(false);
			expect(result13.reason).toBe("Research plan is missing.");

			const applicationWithSections = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [
						{ id: "1", is_detailed_research_plan: true, order: 0, parent_id: null, title: "Test Section" },
					],
				}),
			});

			useApplicationStore.setState({ application: applicationWithSections });
			const result12 = useWizardStore.getState().validateStepNext();
			expect(result12.isValid).toBe(true);
		});

		it("should require at least one RAG source for KNOWLEDGE_BASE", () => {
			useWizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });
			const applicationWithoutSources = ApplicationWithTemplateFactory.build({
				rag_sources: [],
			});

			useApplicationStore.setState({ application: applicationWithoutSources });
			const result = useWizardStore.getState().validateStepNext();
			expect(result.isValid).toBe(false);
			expect(result.reason).toBe("There are no RAG sources.");
		});

		it("should fail KNOWLEDGE_BASE validation when all RAG sources have FAILED status", () => {
			useWizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });
			const applicationWithAllFailedSources = ApplicationWithTemplateFactory.build({
				rag_sources: [
					{ filename: "test1.pdf", sourceId: "1", status: "FAILED" },
					{ filename: "test2.pdf", sourceId: "2", status: "FAILED" },
				],
			});

			useApplicationStore.setState({ application: applicationWithAllFailedSources });
			const result = useWizardStore.getState().validateStepNext();
			expect(result.isValid).toBe(false);
			expect(result.reason).toBe("All RAG sources have failed.");
		});

		it("should pass KNOWLEDGE_BASE validation with mixed FAILED and FINISHED sources", () => {
			useWizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });
			const applicationWithMixedSources = ApplicationWithTemplateFactory.build({
				rag_sources: [
					{ filename: "test1.pdf", sourceId: "1", status: "FAILED" },
					{ filename: "test2.pdf", sourceId: "2", status: "FINISHED" },
				],
			});

			useApplicationStore.setState({ application: applicationWithMixedSources });
			const result = useWizardStore.getState().validateStepNext();
			expect(result.isValid).toBe(true);
			expect(result.reason).toBe("Valid");
		});

		it("should pass KNOWLEDGE_BASE validation with mixed FAILED and INDEXING sources", () => {
			useWizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });
			const applicationWithMixedSources = ApplicationWithTemplateFactory.build({
				rag_sources: [
					{ filename: "test1.pdf", sourceId: "1", status: "FAILED" },
					{ filename: "test2.pdf", sourceId: "2", status: "INDEXING" },
				],
			});

			useApplicationStore.setState({ application: applicationWithMixedSources });
			const result = useWizardStore.getState().validateStepNext();
			expect(result.isValid).toBe(true);
			expect(result.reason).toBe("Valid");
		});

		it("should pass KNOWLEDGE_BASE validation with mixed FAILED and CREATED sources", () => {
			useWizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });
			const applicationWithMixedSources = ApplicationWithTemplateFactory.build({
				rag_sources: [
					{ filename: "test1.pdf", sourceId: "1", status: "FAILED" },
					{ filename: "test2.pdf", sourceId: "2", status: "CREATED" },
				],
			});

			useApplicationStore.setState({ application: applicationWithMixedSources });
			const result = useWizardStore.getState().validateStepNext();
			expect(result.isValid).toBe(true);
			expect(result.reason).toBe("Valid");
		});

		it("should pass KNOWLEDGE_BASE validation with all FINISHED sources", () => {
			useWizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });
			const applicationWithFinishedSources = ApplicationWithTemplateFactory.build({
				rag_sources: [
					{ filename: "test1.pdf", sourceId: "1", status: "FINISHED" },
					{ filename: "test2.pdf", sourceId: "2", status: "FINISHED" },
				],
			});

			useApplicationStore.setState({ application: applicationWithFinishedSources });
			const result = useWizardStore.getState().validateStepNext();
			expect(result.isValid).toBe(true);
			expect(result.reason).toBe("Valid");
		});

		it("should pass KNOWLEDGE_BASE validation with single FINISHED source", () => {
			useWizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });
			const applicationWithSingleSource = ApplicationWithTemplateFactory.build({
				rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED" }],
			});

			useApplicationStore.setState({ application: applicationWithSingleSource });
			const result = useWizardStore.getState().validateStepNext();
			expect(result.isValid).toBe(true);
			expect(result.reason).toBe("Valid");
		});

		it("should fail KNOWLEDGE_BASE validation with single FAILED source", () => {
			useWizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });
			const applicationWithSingleFailedSource = ApplicationWithTemplateFactory.build({
				rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FAILED" }],
			});

			useApplicationStore.setState({ application: applicationWithSingleFailedSource });
			const result = useWizardStore.getState().validateStepNext();
			expect(result.isValid).toBe(false);
			expect(result.reason).toBe("All RAG sources have failed.");
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

		it("should start generation when no text exists", async () => {
			const mockGenerateApplication = vi.fn().mockResolvedValue(true);
			const applicationWithoutText = ApplicationWithTemplateFactory.build({
				text: undefined,
			});

			useApplicationStore.setState({
				application: applicationWithoutText,
				generateApplication: mockGenerateApplication,
			});

			await useWizardStore.getState().generateApplication();

			expect(mockGenerateApplication).toHaveBeenCalled();
			expect(useWizardStore.getState().isGeneratingApplication).toBe(true);
		});
	});

	describe("step navigation side effects", () => {
		it("should reset template generation state when leaving APPLICATION_STRUCTURE", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
				isGeneratingTemplate: false,
				templateGenerationFailed: false,
			});

			useWizardStore.getState().toNextStep();

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

		it("should allow going to previous step when not generating and clear error state", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
				isGeneratingTemplate: false,
				templateGenerationErrorMessage: "Some error",
				templateGenerationFailed: true,
			});

			useWizardStore.getState().toPreviousStep();

			expect(useWizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_DETAILS);
			expect(useWizardStore.getState().templateGenerationFailed).toBe(false);
			expect(useWizardStore.getState().templateGenerationErrorMessage).toBe(null);
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

		it("should return APPLICATION_DETAILS when no grant template exists", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: null,
				id: "app-123",
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.APPLICATION_DETAILS);
		});

		it("should return APPLICATION_DETAILS when grant sections are empty", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
				id: "app-123",
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.APPLICATION_DETAILS);
		});

		it("should return APPLICATION_STRUCTURE when no RAG sources exist", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
				id: "app-123",
				rag_sources: [],
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.APPLICATION_STRUCTURE);
		});

		it("should return KNOWLEDGE_BASE when no research objectives exist", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
				id: "app-123",
				rag_sources: [{ filename: "test.pdf", sourceId: "source-1", status: "FINISHED" }],
				research_objectives: [],
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.KNOWLEDGE_BASE);
		});

		it("should return KNOWLEDGE_BASE when research objectives have no tasks", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
				id: "app-123",
				rag_sources: [{ filename: "test.pdf", sourceId: "source-1", status: "FINISHED" }],
				research_objectives: [
					{
						description: "Description 1",
						number: 1,
						research_tasks: [],
						title: "Objective 1",
					},
				],
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.KNOWLEDGE_BASE);
		});

		it("should return RESEARCH_PLAN when no form inputs exist", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: null,
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
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
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.RESEARCH_PLAN);
		});

		it("should return RESEARCH_PLAN when form inputs are empty", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: {
					background_context: "",
					hypothesis: "",
					impact: "",
					novelty_and_innovation: "",
					preliminary_data: "",
					rationale: "",
					research_feasibility: "",
					scientific_infrastructure: "",
					team_excellence: "",
				},
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
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
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.RESEARCH_PLAN);
		});

		it("should return RESEARCH_DEEP_DIVE when form inputs exist but no application text", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: {
					background_context: "Some content",
					hypothesis: "",
					impact: "",
					novelty_and_innovation: "",
					preliminary_data: "",
					rationale: "",
					research_feasibility: "",
					team_excellence: "",
				},
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
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
				text: null,
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.RESEARCH_DEEP_DIVE);
		});

		it("should return GENERATE_AND_COMPLETE when application text exists", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: {
					background_context: "Some content",
					hypothesis: "",
					impact: "",
					novelty_and_innovation: "",
					preliminary_data: "",
					rationale: "",
					research_feasibility: "",
					team_excellence: "",
				},
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
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
				text: "Generated application text",
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.GENERATE_AND_COMPLETE);
		});

		it("should return GENERATE_AND_COMPLETE when application has text", () => {
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
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
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
				text: "Some existing application text",
				title: "A Valid Application Title With More Than 10 Chars",
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.GENERATE_AND_COMPLETE);
		});

		it("should return RESEARCH_DEEP_DIVE when form inputs are populated but no application text", () => {
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
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
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
				text: undefined,
				title: "A Valid Application Title With More Than 10 Chars",
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.RESEARCH_DEEP_DIVE);
		});

		it("should return RESEARCH_PLAN when research objectives have tasks but no form inputs", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
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
				text: undefined,
				title: "A Valid Application Title With More Than 10 Chars",
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.RESEARCH_PLAN);
		});

		it("should return KNOWLEDGE_BASE when application has rag sources but no objectives", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
				id: "app-123",
				rag_sources: [{ filename: "test.pdf", sourceId: "source-1", status: "FINISHED" }],
				research_objectives: [],
				text: undefined,
				title: "A Valid Application Title With More Than 10 Chars",
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.KNOWLEDGE_BASE);
		});

		it("should return APPLICATION_STRUCTURE when grant template has sections but no rag sources", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
				grant_template: GrantTemplateFactory.build({
					grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
				}),
				id: "app-123",
				rag_sources: [],
				research_objectives: [],
				text: undefined,
				title: "A Valid Application Title With More Than 10 Chars",
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.APPLICATION_STRUCTURE);
		});

		it("should return APPLICATION_DETAILS when grant sections are empty with form inputs undefined", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
				id: "app-123",
				rag_sources: [],
				research_objectives: [],
				text: undefined,
				title: "A Valid Application Title With More Than 10 Chars",
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

		it("should return APPLICATION_DETAILS when title is too short", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
				id: "app-123",
				rag_sources: [],
				research_objectives: [],
				text: undefined,
				title: "Short",
			});
			useApplicationStore.setState({ application });
			const result = determineAppropriateStep("app-123");
			expect(result).toBe(WizardStep.APPLICATION_DETAILS);
		});

		describe("Edge case: User invalidates earlier steps", () => {
			it("should return APPLICATION_STRUCTURE when user deletes RAG sources after reaching RESEARCH_DEEP_DIVE", () => {
				const application = ApplicationWithTemplateFactory.build({
					form_inputs: {
						background_context: "Some content",
						hypothesis: "Some hypothesis",
						impact: "",
						novelty_and_innovation: "",
						preliminary_data: "",
						rationale: "Some rationale",
						research_feasibility: "",
						scientific_infrastructure: "",
						team_excellence: "",
					},
					grant_template: GrantTemplateFactory.build({
						grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
					}),
					id: "app-123",
					rag_sources: [],
					research_objectives: [
						{
							description: "Description 1",
							number: 1,
							research_tasks: [{ description: "Task description", number: 1, title: "Task 1" }],
							title: "Objective 1",
						},
					],
					title: "A Valid Application Title With More Than 10 Chars",
				});
				useApplicationStore.setState({ application });

				const result = determineAppropriateStep("app-123");
				expect(result).toBe(WizardStep.APPLICATION_STRUCTURE);
			});

			it("should return KNOWLEDGE_BASE when user deletes research tasks after reaching GENERATE_AND_COMPLETE", () => {
				const application = ApplicationWithTemplateFactory.build({
					form_inputs: {
						background_context: "Some content",
						hypothesis: "Some hypothesis",
						impact: "",
						novelty_and_innovation: "",
						preliminary_data: "",
						rationale: "Some rationale",
						research_feasibility: "",
						scientific_infrastructure: "",
						team_excellence: "",
					},
					grant_template: GrantTemplateFactory.build({
						grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Section 1" }],
					}),
					id: "app-123",
					rag_sources: [{ filename: "test.pdf", sourceId: "source-1", status: "FINISHED" }],
					research_objectives: [
						{
							description: "Description 1",
							number: 1,
							research_tasks: [],
							title: "Objective 1",
						},
					],
					text: "Generated application text",
					title: "A Valid Application Title With More Than 10 Chars",
				});
				useApplicationStore.setState({ application });

				const result = determineAppropriateStep("app-123");
				expect(result).toBe(WizardStep.KNOWLEDGE_BASE);
			});

			it("should return APPLICATION_DETAILS when user deletes grant sections after completing all steps", () => {
				const application = ApplicationWithTemplateFactory.build({
					form_inputs: {
						background_context: "Some content",
						hypothesis: "Some hypothesis",
						impact: "",
						novelty_and_innovation: "",
						preliminary_data: "",
						rationale: "Some rationale",
						research_feasibility: "",
						scientific_infrastructure: "",
						team_excellence: "",
					},
					grant_template: GrantTemplateFactory.build({
						grant_sections: [],
					}),
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
					text: "Generated application text",
					title: "",
				});
				useApplicationStore.setState({ application });

				const result = determineAppropriateStep("app-123");
				expect(result).toBe(WizardStep.APPLICATION_DETAILS);
			});
		});
	});
});
