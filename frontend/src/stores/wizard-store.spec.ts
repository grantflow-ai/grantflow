import { ApplicationWithTemplateFactory, GrantTemplateFactory } from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";

import { useWizardStore } from "./wizard-store";

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
});
