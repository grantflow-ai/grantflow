import { ApplicationFactory, ApplicationWithTemplateFactory, GrantTemplateFactory } from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { applicationStore } from "@/stores/application-store";

import { MIN_TITLE_LENGTH, wizardStore } from "./wizard-store";

vi.mock("@/stores/application-store", () => ({
	applicationStore: {
		getState: vi.fn(),
	},
}));

describe("wizard store", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		const wizardState = wizardStore.getState();
		wizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
			polling: {
				...wizardState.polling,
				intervalId: null,
				isActive: false,
			},
		});
	});

	describe("validateStepNext", () => {
		describe("APPLICATION_DETAILS step validation", () => {
			beforeEach(() => {
				wizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			});

			it("should return true when title is long enough", () => {
				const application = ApplicationFactory.build({
					title: "A".repeat(MIN_TITLE_LENGTH),
				});

				vi.mocked(applicationStore.getState).mockReturnValue({
					application,
				} as any);

				const { validateStepNext } = wizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return false when title is too short", () => {
				const application = ApplicationFactory.build({
					title: "A".repeat(MIN_TITLE_LENGTH - 1),
				});

				vi.mocked(applicationStore.getState).mockReturnValue({
					application,
				} as any);

				const { validateStepNext } = wizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when application is null", () => {
				vi.mocked(applicationStore.getState).mockReturnValue({
					application: null,
				} as any);

				const { validateStepNext } = wizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when title is empty", () => {
				const application = ApplicationFactory.build({
					title: "",
				});

				vi.mocked(applicationStore.getState).mockReturnValue({
					application,
				} as any);

				const { validateStepNext } = wizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when title is whitespace only", () => {
				const application = ApplicationFactory.build({
					title: "   ",
				});

				vi.mocked(applicationStore.getState).mockReturnValue({
					application,
				} as any);

				const { validateStepNext } = wizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});
		});

		describe("other steps validation", () => {
			it("should return true for KNOWLEDGE_BASE step", () => {
				wizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});

				vi.mocked(applicationStore.getState).mockReturnValue({
					application: ApplicationFactory.build(),
				} as any);

				const { validateStepNext } = wizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return true for GENERATE_AND_COMPLETE step", () => {
				wizardStore.setState({
					currentStep: WizardStep.GENERATE_AND_COMPLETE,
				});

				vi.mocked(applicationStore.getState).mockReturnValue({
					application: ApplicationFactory.build(),
				} as any);

				const { validateStepNext } = wizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});
		});
	});

	describe("polling", () => {
		it("should start polling with immediate call", () => {
			const mockApiFunction = vi.fn();
			const store = wizardStore.getState();

			store.polling.start(mockApiFunction, 1000, true);

			expect(mockApiFunction).toHaveBeenCalledTimes(1);

			const updatedState = wizardStore.getState();
			expect(updatedState.polling.isActive).toBe(true);
			expect(updatedState.polling.intervalId).not.toBe(null);

			updatedState.polling.stop();
		});

		it("should start polling without immediate call", () => {
			const mockApiFunction = vi.fn();
			const store = wizardStore.getState();

			store.polling.start(mockApiFunction, 1000, false);

			expect(mockApiFunction).not.toHaveBeenCalled();

			const updatedState = wizardStore.getState();
			expect(updatedState.polling.isActive).toBe(true);
			expect(updatedState.polling.intervalId).not.toBe(null);

			updatedState.polling.stop();
		});

		it("should stop polling", () => {
			const mockApiFunction = vi.fn();
			const store = wizardStore.getState();

			store.polling.start(mockApiFunction, 1000);
			store.polling.stop();

			const updatedState = wizardStore.getState();
			expect(updatedState.polling.isActive).toBe(false);
			expect(updatedState.polling.intervalId).toBe(null);
		});

		it("should not start polling if already active", () => {
			const mockApiFunction1 = vi.fn();
			const mockApiFunction2 = vi.fn();
			const store = wizardStore.getState();

			store.polling.start(mockApiFunction1, 1000);
			const firstIntervalId = wizardStore.getState().polling.intervalId;

			store.polling.start(mockApiFunction2, 1000);
			const secondIntervalId = wizardStore.getState().polling.intervalId;

			expect(firstIntervalId).toBe(secondIntervalId);
			expect(mockApiFunction1).toHaveBeenCalledTimes(1);
			expect(mockApiFunction2).not.toHaveBeenCalled();

			store.polling.stop();
		});
	});

	describe("navigation", () => {
		it("should navigate to next step", () => {
			const { toNextStep } = wizardStore.getState();

			toNextStep();
			expect(wizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_STRUCTURE);

			toNextStep();
			expect(wizardStore.getState().currentStep).toBe(WizardStep.KNOWLEDGE_BASE);
		});

		it("should not navigate beyond last step", () => {
			wizardStore.setState({
				currentStep: WizardStep.GENERATE_AND_COMPLETE,
			});

			const { toNextStep } = wizardStore.getState();
			toNextStep();

			expect(wizardStore.getState().currentStep).toBe(WizardStep.GENERATE_AND_COMPLETE);
		});

		it("should navigate to previous step", () => {
			wizardStore.setState({
				currentStep: WizardStep.KNOWLEDGE_BASE,
			});

			const { toPreviousStep } = wizardStore.getState();

			toPreviousStep();
			expect(wizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_STRUCTURE);

			toPreviousStep();
			expect(wizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_DETAILS);
		});

		it("should not navigate before first step", () => {
			const { toPreviousStep } = wizardStore.getState();
			toPreviousStep();

			expect(wizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_DETAILS);
		});

		it("should trigger template generation when moving from APPLICATION_DETAILS step", () => {
			const mockGenerateTemplate = vi.fn();
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...GrantTemplateFactory.build(),
					grant_sections: [],
				},
			});

			vi.mocked(applicationStore.getState).mockReturnValue({
				application,
				generateTemplate: mockGenerateTemplate,
			} as any);

			const { toNextStep } = wizardStore.getState();
			toNextStep();

			expect(mockGenerateTemplate).toHaveBeenCalledWith(application.grant_template!.id);
		});
	});

	describe("handleTitleChange", () => {
		it("should call applicationStore methods", () => {
			const mockSetApplicationTitle = vi.fn();
			const mockUpdateApplicationTitle = vi.fn();
			const application = ApplicationFactory.build({
				title: "Old Title",
				workspace_id: "workspace-123",
			});

			vi.mocked(applicationStore.getState).mockReturnValue({
				application,
				setApplicationTitle: mockSetApplicationTitle,
				updateApplicationTitle: mockUpdateApplicationTitle,
			} as any);

			const { handleTitleChange } = wizardStore.getState();
			handleTitleChange("New Title");

			expect(mockSetApplicationTitle).toHaveBeenCalledWith("New Title");
		});
	});

	describe("reset", () => {
		it("should reset to initial state and clear polling", () => {
			const mockApiFunction = vi.fn();
			const store = wizardStore.getState();

			store.polling.start(mockApiFunction, 1000);
			wizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });

			store.reset();

			const state = wizardStore.getState();
			expect(state.currentStep).toBe(WizardStep.APPLICATION_DETAILS);
			expect(state.polling.isActive).toBe(false);
			expect(state.polling.intervalId).toBe(null);
		});
	});
});
