import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantTemplateFactory,
	RagSourceFactory,
} from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";

import { MIN_TITLE_LENGTH, useWizardStore } from "./wizard-store";

vi.mock("@/stores/application-store", () => ({
	useApplicationStore: {
		getState: vi.fn(),
	},
}));

describe("wizard store", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		const wizardState = useWizardStore.getState();
		useWizardStore.setState({
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
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			});

			it("should return true when title is long enough", () => {
				const application = ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({
						rag_sources: [RagSourceFactory.build()],
					}),
					title: "A".repeat(MIN_TITLE_LENGTH),
				});

				vi.mocked(useApplicationStore.getState).mockReturnValue({
					application,
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return false when title is too short", () => {
				const application = ApplicationFactory.build({
					title: "A".repeat(MIN_TITLE_LENGTH - 1),
				});

				vi.mocked(useApplicationStore.getState).mockReturnValue({
					application,
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when application is null", () => {
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					application: null,
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when title is empty", () => {
				const application = ApplicationFactory.build({
					title: "",
				});

				vi.mocked(useApplicationStore.getState).mockReturnValue({
					application,
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when title is whitespace only", () => {
				const application = ApplicationFactory.build({
					title: "   ",
				});

				vi.mocked(useApplicationStore.getState).mockReturnValue({
					application,
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});
		});

		describe("other steps validation", () => {
			it("should return true for KNOWLEDGE_BASE step", () => {
				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});

				const application = ApplicationFactory.build({
					rag_sources: [
						RagSourceFactory.build({ status: "FINISHED" }),
						RagSourceFactory.build({ status: "FINISHED" }),
					],
				});

				vi.mocked(useApplicationStore.getState).mockReturnValue({
					application,
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return true for GENERATE_AND_COMPLETE step", () => {
				useWizardStore.setState({
					currentStep: WizardStep.GENERATE_AND_COMPLETE,
				});

				vi.mocked(useApplicationStore.getState).mockReturnValue({
					application: ApplicationFactory.build(),
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});
		});
	});

	describe("polling", () => {
		it("should start polling with immediate call", () => {
			const mockApiFunction = vi.fn();
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 1000, true);

			expect(mockApiFunction).toHaveBeenCalledTimes(1);

			const updatedState = useWizardStore.getState();
			expect(updatedState.polling.isActive).toBe(true);
			expect(updatedState.polling.intervalId).not.toBe(null);

			updatedState.polling.stop();
		});

		it("should start polling without immediate call", () => {
			const mockApiFunction = vi.fn();
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 1000, false);

			expect(mockApiFunction).not.toHaveBeenCalled();

			const updatedState = useWizardStore.getState();
			expect(updatedState.polling.isActive).toBe(true);
			expect(updatedState.polling.intervalId).not.toBe(null);

			updatedState.polling.stop();
		});

		it("should stop polling", () => {
			const mockApiFunction = vi.fn();
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 1000);
			store.polling.stop();

			const updatedState = useWizardStore.getState();
			expect(updatedState.polling.isActive).toBe(false);
			expect(updatedState.polling.intervalId).toBe(null);
		});

		it("should not start polling if already active", () => {
			const mockApiFunction1 = vi.fn();
			const mockApiFunction2 = vi.fn();
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction1, 1000);
			const firstIntervalId = useWizardStore.getState().polling.intervalId;

			store.polling.start(mockApiFunction2, 1000);
			const secondIntervalId = useWizardStore.getState().polling.intervalId;

			expect(firstIntervalId).toBe(secondIntervalId);
			expect(mockApiFunction1).toHaveBeenCalledTimes(1);
			expect(mockApiFunction2).not.toHaveBeenCalled();

			store.polling.stop();
		});
	});

	describe("navigation", () => {
		it("should navigate to next step", () => {
			const { toNextStep } = useWizardStore.getState();

			toNextStep();
			expect(useWizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_STRUCTURE);

			toNextStep();
			expect(useWizardStore.getState().currentStep).toBe(WizardStep.KNOWLEDGE_BASE);
		});

		it("should not navigate beyond last step", () => {
			useWizardStore.setState({
				currentStep: WizardStep.GENERATE_AND_COMPLETE,
			});

			const { toNextStep } = useWizardStore.getState();
			toNextStep();

			expect(useWizardStore.getState().currentStep).toBe(WizardStep.GENERATE_AND_COMPLETE);
		});

		it("should navigate to previous step", () => {
			useWizardStore.setState({
				currentStep: WizardStep.KNOWLEDGE_BASE,
			});

			const { toPreviousStep } = useWizardStore.getState();

			toPreviousStep();
			expect(useWizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_STRUCTURE);

			toPreviousStep();
			expect(useWizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_DETAILS);
		});

		it("should not navigate before first step", () => {
			const { toPreviousStep } = useWizardStore.getState();
			toPreviousStep();

			expect(useWizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_DETAILS);
		});

		it("should trigger template generation when moving from APPLICATION_DETAILS step", () => {
			const mockGenerateTemplate = vi.fn();
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...GrantTemplateFactory.build(),
					grant_sections: [],
				},
			});

			vi.mocked(useApplicationStore.getState).mockReturnValue({
				application,
				generateTemplate: mockGenerateTemplate,
			} as any);

			const { toNextStep } = useWizardStore.getState();
			toNextStep();

			expect(mockGenerateTemplate).toHaveBeenCalledWith(application.grant_template!.id);
		});
	});

	describe("handleTitleChange", () => {
		it("should call useApplicationStore methods", () => {
			const mockUpdateApplication = vi.fn();
			const mockUpdateApplicationTitle = vi.fn();
			const application = ApplicationFactory.build({
				title: "Old Title",
				workspace_id: "workspace-123",
			});

			vi.mocked(useApplicationStore.getState).mockReturnValue({
				application,
				updateApplication: mockUpdateApplication,
				updateApplicationTitle: mockUpdateApplicationTitle,
			} as any);

			const { handleTitleChange } = useWizardStore.getState();
			handleTitleChange("New Title");

			expect(mockUpdateApplication).toHaveBeenCalledWith({ title: "New Title" });
		});
	});

	describe("reset", () => {
		it("should reset to initial state and clear polling", () => {
			const mockApiFunction = vi.fn();
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 1000);
			useWizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });

			store.reset();

			const state = useWizardStore.getState();
			expect(state.currentStep).toBe(WizardStep.APPLICATION_DETAILS);
			expect(state.polling.isActive).toBe(false);
			expect(state.polling.intervalId).toBe(null);
		});
	});
});
