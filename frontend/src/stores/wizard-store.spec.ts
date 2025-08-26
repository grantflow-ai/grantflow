import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ApplicationWithTemplateFactory, GrantTemplateFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";

import { useWizardStore } from "./wizard-store";

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

			const { application } = useApplicationStore.getState();
			useApplicationStore.setState({
				application: {
					...application,
					grant_template: {
						...application?.grant_template,
						rag_sources: [],
					},
					title: "Short",
				} as any,
			});

			expect(useWizardStore.getState().validateStepNext()).toBe(false);

			useApplicationStore.setState({
				application: {
					...useApplicationStore.getState().application,
					grant_template: {
						...useApplicationStore.getState().application?.grant_template,
						rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED" }],
					},
					title: "This is a longer title that meets requirements",
				} as any,
			});

			expect(useWizardStore.getState().validateStepNext()).toBe(true);
		});

		it("should require grant sections for APPLICATION_STRUCTURE", () => {
			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_STRUCTURE });

			const { application } = useApplicationStore.getState();

			useApplicationStore.setState({
				application: {
					...application,
					grant_template: {
						...application?.grant_template,
						grant_sections: [],
					},
				} as any,
			});

			expect(useWizardStore.getState().validateStepNext()).toBe(false);

			useApplicationStore.setState({
				application: {
					...useApplicationStore.getState().application,
					grant_template: {
						...useApplicationStore.getState().application?.grant_template,
						grant_sections: [{ title: "Test Section" }],
					},
				} as any,
			});

			expect(useWizardStore.getState().validateStepNext()).toBe(true);
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

			expect(useWizardStore.getState().validateStepNext()).toBe(true);
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

			expect(useWizardStore.getState().validateStepNext()).toBe(false);
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

			expect(useWizardStore.getState().validateStepNext()).toBe(true);
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

			expect(useWizardStore.getState().validateStepNext()).toBe(false);
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

			it("should show error when documents are still indexing", async () => {
				const { toast } = await import("sonner");
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: [
						{ filename: "doc1.pdf", sourceId: "1", status: "INDEXING" as const },
						{ filename: "doc2.pdf", sourceId: "2", status: "FINISHED" as const },
					],
				});

				useApplicationStore.setState({ application });

				await useWizardStore.getState().triggerAutofill("research_plan");

				expect(toast.error).toHaveBeenCalledWith(
					"Please wait for all documents to finish processing before using autofill",
				);
			});

			it("should show error when no documents are uploaded", async () => {
				const { toast } = await import("sonner");
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: [],
				});

				useApplicationStore.setState({ application });

				await useWizardStore.getState().triggerAutofill("research_plan");

				expect(toast.error).toHaveBeenCalledWith("Please upload at least one document before using autofill");
			});

			it("should successfully trigger autofill for research plan", async () => {
				const { triggerAutofill: mockTriggerAutofill } = await import("@/actions/grant-applications");
				const { toast } = await import("sonner");

				(mockTriggerAutofill as any).mockResolvedValue({
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

				await useWizardStore.getState().triggerAutofill("research_plan");

				expect(mockTriggerAutofill).toHaveBeenCalledWith("mock-org-id", "proj-123", "app-123", {
					autofill_type: "research_plan",
				});

				expect(toast.success).toHaveBeenCalledWith("Autofill request sent. Processing your documents...");
			});

			it("should trigger autofill with field name for research deep dive", async () => {
				const { triggerAutofill: mockTriggerAutofill } = await import("@/actions/grant-applications");

				(mockTriggerAutofill as any).mockResolvedValue({
					application_id: "app-123",
					autofill_type: "research_deep_dive",
					field_name: "hypothesis",
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
					field_name: "hypothesis",
				});
			});

			it("should handle autofill errors gracefully", async () => {
				const { triggerAutofill: mockTriggerAutofill } = await import("@/actions/grant-applications");
				const { toast } = await import("sonner");

				const error = new Error("API Error: Rate limit exceeded");
				(mockTriggerAutofill as any).mockRejectedValue(error);

				const application = ApplicationWithTemplateFactory.build({
					id: "app-123",
					project_id: "proj-123",
					rag_sources: [{ filename: "doc1.pdf", sourceId: "1", status: "FINISHED" as const }],
				});

				useApplicationStore.setState({ application });

				await useWizardStore.getState().triggerAutofill("research_plan");

				expect(toast.error).toHaveBeenCalledWith("Autofill error: API Error: Rate limit exceeded");
				expect(useWizardStore.getState().isAutofillLoading.research_plan).toBe(false);
			});
		});
	});
});
