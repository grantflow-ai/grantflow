import { ApplicationWithTemplateFactory, GrantTemplateFactory } from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";

import { useWizardStore } from "./wizard-store";

// Mock the triggerAutofill action
vi.mock("@/actions/grant-applications", () => ({
	triggerAutofill: vi.fn(),
}));

// Mock sonner for toast notifications
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

describe("wizard store", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		useApplicationStore.setState({
			application: null,
			areAppOperationsInProgress: false,
			generateTemplate: vi.fn(),
			ragJobState: {
				isRestoring: false,
				restoredJob: null,
			},
		});

		const wizardState = useWizardStore.getState();
		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
			isAutofillLoading: {
				research_deep_dive: false,
				research_plan: false,
			},
			isGeneratingTemplate: false,
			polling: {
				...wizardState.polling,
				intervalId: null,
				isActive: false,
			},
		});
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
				retrieveApplication: vi.fn().mockResolvedValue(undefined),
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
				retrieveApplication: vi.fn().mockResolvedValue(undefined),
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

				expect(mockTriggerAutofill).toHaveBeenCalledWith("proj-123", "app-123", {
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

				expect(mockTriggerAutofill).toHaveBeenCalledWith("proj-123", "app-123", {
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
