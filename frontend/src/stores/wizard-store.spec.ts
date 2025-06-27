import { ApplicationFactory, ApplicationWithTemplateFactory, GrantTemplateFactory } from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";

import { MIN_TITLE_LENGTH, useWizardStore } from "./wizard-store";

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
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED", url: undefined }],
				}),
				title: "x".repeat(MIN_TITLE_LENGTH - 1),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_DETAILS });

			expect(useWizardStore.getState().validateStepNext()).toBe(false);
		});

		it("should require grant sections for PREVIEW_AND_APPROVE", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_STRUCTURE });

			expect(useWizardStore.getState().validateStepNext()).toBe(false);
		});
	});

	describe("polling", () => {
		it("should start polling correctly", () => {
			const mockFn = vi.fn();
			const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

			useWizardStore.getState().polling.start(mockFn, 1000, true);

			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
			expect(useWizardStore.getState().polling.isActive).toBe(true);
		});

		it("should stop polling correctly", () => {
			const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
			const intervalId = setInterval(() => {}, 1000);

			useWizardStore.setState({
				polling: {
					intervalId,
					isActive: true,
					start: vi.fn(),
					stop: useWizardStore.getState().polling.stop,
				},
			});

			useWizardStore.getState().polling.stop();

			expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
			expect(useWizardStore.getState().polling.isActive).toBe(false);
			expect(useWizardStore.getState().polling.intervalId).toBeNull();
		});
	});
});
