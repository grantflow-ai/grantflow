import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	FileWithIdFactory,
	GrantTemplateFactory,
	RagSourceFactory,
} from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as grantApplicationActions from "@/actions/grant-applications";
import * as grantTemplateActions from "@/actions/grant-template";
import { WizardStep } from "@/constants";

import { useApplicationStore } from "./application-store";
import { MIN_TITLE_LENGTH, useWizardStore } from "./wizard-store";

vi.mock("@/actions/grant-applications", () => ({
	createApplication: vi.fn(),
	retrieveApplication: vi.fn(),
	updateApplication: vi.fn(),
}));

vi.mock("@/actions/grant-template", () => ({
	generateGrantTemplate: vi.fn(),
	updateGrantTemplate: vi.fn(),
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

		useApplicationStore.setState({
			application: null,
			applicationTitle: "",
			isLoading: false,
			uploadedFiles: {
				application: [],
				template: [],
			},
			urls: {
				application: [],
				template: [],
			},
		});
	});

	describe("handleTitleChange", () => {
		it("should update title immediately", () => {
			const application = ApplicationFactory.build({ workspace_id: "workspace-123" });

			useApplicationStore.setState({
				application,
				applicationTitle: application.title,
			});

			const { handleTitleChange } = useWizardStore.getState();

			handleTitleChange("New Title");

			expect(useApplicationStore.getState().applicationTitle).toBe("New Title");
		});

		it("should debounce backend update", async () => {
			const application = ApplicationFactory.build({ title: "Old Title", workspace_id: "workspace-123" });
			const updatedApplication = { ...application, title: "New Title" };
			vi.mocked(grantApplicationActions.updateApplication).mockResolvedValue(updatedApplication);

			useApplicationStore.setState({
				application,
				applicationTitle: application.title,
			});

			await useApplicationStore.getState().updateApplicationTitle("workspace-123", application.id, "New Title");

			expect(grantApplicationActions.updateApplication).toHaveBeenCalledWith("workspace-123", application.id, {
				title: "New Title",
			});

			expect(useApplicationStore.getState().application?.title).toBe("New Title");
			expect(useApplicationStore.getState().applicationTitle).toBe("New Title");
		});

		it("should not update backend if title is same as current", async () => {
			const application = ApplicationFactory.build({ title: "Current Title", workspace_id: "workspace-123" });
			vi.mocked(grantApplicationActions.updateApplication).mockResolvedValue(application);

			useApplicationStore.setState({
				application,
				applicationTitle: application.title,
			});

			const { handleTitleChange } = useWizardStore.getState();

			handleTitleChange("Current Title");

			expect(useApplicationStore.getState().applicationTitle).toBe("Current Title");

			await new Promise((resolve) => setTimeout(resolve, 600));

			expect(grantApplicationActions.updateApplication).not.toHaveBeenCalled();
		});
	});

	describe("validateStepNext", () => {
		describe("when application is null", () => {
			it("should return false", () => {
				useApplicationStore.setState({
					application: null,
					applicationTitle: "",
					isLoading: false,
					uploadedFiles: {
						application: [],
						template: [],
					},
					urls: {
						application: [],
						template: [],
					},
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});
		});

		describe("step 0 validation", () => {
			beforeEach(() => {
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			});

			it("should return true when title is long enough and has URLs", () => {
				const application = ApplicationFactory.build();
				useApplicationStore.setState({
					application,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					isLoading: false,
					uploadedFiles: {
						application: [],
						template: [],
					},
					urls: {
						application: [],
						template: ["https://example.com"],
					},
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return true when title is long enough and has files", () => {
				const application = ApplicationFactory.build();
				useApplicationStore.setState({
					application,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					isLoading: false,
					uploadedFiles: {
						application: [],
						template: [FileWithIdFactory.build()],
					},
					urls: {
						application: [],
						template: [],
					},
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return true when title is long enough and has both URLs and files", () => {
				const application = ApplicationFactory.build();
				useApplicationStore.setState({
					application,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					isLoading: false,
					uploadedFiles: {
						application: [],
						template: [FileWithIdFactory.build()],
					},
					urls: {
						application: [],
						template: ["https://example.com"],
					},
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return false when title is too short", () => {
				const application = ApplicationFactory.build();
				useApplicationStore.setState({
					application,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH - 1),
					isLoading: false,
					uploadedFiles: {
						application: [],
						template: [FileWithIdFactory.build()],
					},
					urls: {
						application: [],
						template: ["https://example.com"],
					},
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should trim whitespace from title", () => {
				const application = ApplicationFactory.build();
				useApplicationStore.setState({
					application,
					applicationTitle: `   ${"A".repeat(MIN_TITLE_LENGTH)}   `,
					isLoading: false,
					uploadedFiles: {
						application: [],
						template: [],
					},
					urls: {
						application: [],
						template: ["https://example.com"],
					},
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return false when neither URLs nor files are present", () => {
				const application = ApplicationFactory.build();
				useApplicationStore.setState({
					application,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					isLoading: false,
					uploadedFiles: {
						application: [],
						template: [],
					},
					urls: {
						application: [],
						template: [],
					},
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});
		});

		describe("step 1 validation", () => {
			beforeEach(() => {
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_STRUCTURE,
				});
			});

			it("should return true when grant template has sections", () => {
				const application = ApplicationWithTemplateFactory.build();
				useApplicationStore.setState({
					application,
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return false when grant template is null", () => {
				const application = ApplicationFactory.build({ grant_template: undefined });
				useApplicationStore.setState({
					application,
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when grant template has no sections", () => {
				const application = ApplicationWithTemplateFactory.build({
					grant_template: {
						...GrantTemplateFactory.build(),
						grant_sections: [],
					},
				});
				useApplicationStore.setState({
					application,
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});
		});

		describe("step 2 validation", () => {
			beforeEach(() => {
				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			});

			it("should return true when rag sources exist and none have failed", () => {
				const ragSources = RagSourceFactory.batch(3, { status: "FINISHED" });
				const application = ApplicationFactory.build({
					rag_sources: ragSources,
				});
				useApplicationStore.setState({
					application,
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return true with mixed non-failed statuses", () => {
				const ragSources = [
					RagSourceFactory.build({ status: "INDEXING" }),
					RagSourceFactory.build({ status: "FINISHED" }),
					RagSourceFactory.build({ status: "FINISHED" }),
				];
				const application = ApplicationFactory.build({
					rag_sources: ragSources,
				});
				useApplicationStore.setState({
					application,
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return false when any rag source has failed", () => {
				const ragSources = [
					RagSourceFactory.build({ status: "FINISHED" }),
					RagSourceFactory.build({ status: "FAILED" }),
					RagSourceFactory.build({ status: "INDEXING" }),
				];
				const application = ApplicationFactory.build({
					rag_sources: ragSources,
				});
				useApplicationStore.setState({
					application,
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when no rag sources exist", () => {
				const application = ApplicationFactory.build({
					rag_sources: [],
				});
				useApplicationStore.setState({
					application,
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});
		});

		describe("unknown step", () => {
			it("should return false for steps beyond 2", () => {
				const application = ApplicationFactory.build();
				useApplicationStore.setState({
					application,
				});

				useWizardStore.setState({
					currentStep: WizardStep.RESEARCH_PLAN,
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
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

		it("should trigger template generation when moving from step 0 to 1", async () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...GrantTemplateFactory.build(),
					grant_sections: [],
				},
			});

			useApplicationStore.setState({
				application,
			});

			const { toNextStep } = useWizardStore.getState();
			toNextStep();

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(grantTemplateActions.generateGrantTemplate).toHaveBeenCalledWith(
				application.workspace_id,
				application.id,
				application.grant_template!.id,
			);
		});
	});
});