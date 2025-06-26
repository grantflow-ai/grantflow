import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantSectionBaseFactory,
	GrantTemplateFactory,
	RagJobResponseFactory,
	RagSourceFactory,
} from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { retrieveRagJob } from "@/actions/rag-jobs";

vi.mock("@/actions/rag-jobs");

import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import type { API } from "@/types/api-types";

import { MIN_TITLE_LENGTH, useWizardStore } from "./wizard-store";

describe("wizard store", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		useApplicationStore.setState({
			application: null,
			areAppOperationsInProgress: false,
			ragJobState: {
				isRestoring: false,
				restoredJob: null,
			},
		});

		const wizardState = useWizardStore.getState();
		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
			grantTemplateRagJobData: null,
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
			expect(state.grantTemplateRagJobData).toBeNull();
			expect(state.polling.isActive).toBe(false);
			expect(state.polling.intervalId).toBeNull();
		});
	});

	describe("validateStepNext", () => {
		describe("APPLICATION_DETAILS step validation", () => {
			beforeEach(() => {
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			});

			it("should return true when title is long enough and has sources", () => {
				const application = ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({
						rag_sources: [RagSourceFactory.build()],
					}),
					title: "A".repeat(MIN_TITLE_LENGTH),
				});

				useApplicationStore.setState({ application });

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return false when title is too short", () => {
				const application = ApplicationFactory.build({
					title: "A".repeat(MIN_TITLE_LENGTH - 1),
				});

				useApplicationStore.setState({ application });

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when application is null", () => {
				useApplicationStore.setState({ application: null });

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when title is empty", () => {
				const application = ApplicationFactory.build({
					title: "",
				});

				useApplicationStore.setState({ application });

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when title is whitespace only", () => {
				const application = ApplicationFactory.build({
					title: "   ",
				});

				useApplicationStore.setState({ application });

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});
		});

		describe("KNOWLEDGE_BASE step validation", () => {
			beforeEach(() => {
				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			});

			it("should return true when sources exist and none are failed", () => {
				const application = ApplicationFactory.build({
					rag_sources: [
						RagSourceFactory.build({ status: "FINISHED" }),
						RagSourceFactory.build({ status: "INDEXING" }),
					],
				});

				useApplicationStore.setState({ application });

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return false when some sources have failed", () => {
				const application = ApplicationFactory.build({
					rag_sources: [
						RagSourceFactory.build({ status: "FINISHED" }),
						RagSourceFactory.build({ status: "FAILED" }),
					],
				});

				useApplicationStore.setState({ application });

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when no sources exist", () => {
				const application = ApplicationFactory.build({
					rag_sources: [],
				});

				useApplicationStore.setState({ application });

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});
		});

		describe("other steps validation", () => {
			it("should return true for GENERATE_AND_COMPLETE step", () => {
				useWizardStore.setState({
					currentStep: WizardStep.GENERATE_AND_COMPLETE,
				});

				useApplicationStore.setState({ application: ApplicationFactory.build() });

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return true for APPLICATION_STRUCTURE step", () => {
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_STRUCTURE,
				});

				const application = ApplicationWithTemplateFactory.build({
					grant_template: GrantTemplateFactory.build({
						grant_sections: [GrantSectionBaseFactory.build({ id: "1", order: 0, title: "Section 1" })],
					}),
				});

				useApplicationStore.setState({ application });

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});
		});
	});

	describe("checkTemplateRagJobStatus", () => {
		it("should fetch and update job status", async () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_job_id: "job-123",
				}),
			});
			const jobData = RagJobResponseFactory.build({ status: "PROCESSING" });

			useApplicationStore.setState({ application });
			vi.mocked(retrieveRagJob).mockResolvedValue(jobData);

			const { checkTemplateRagJobStatus } = useWizardStore.getState();
			await checkTemplateRagJobStatus();

			expect(retrieveRagJob).toHaveBeenCalledWith(application.project_id, "job-123");

			const state = useWizardStore.getState();
			expect(state.grantTemplateRagJobData).toEqual(jobData);
		});

		it("should handle API errors gracefully", async () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_job_id: "job-123",
				}),
			});

			useApplicationStore.setState({ application });
			vi.mocked(retrieveRagJob).mockRejectedValue(new Error("Network error"));

			const { checkTemplateRagJobStatus } = useWizardStore.getState();
			await checkTemplateRagJobStatus();

			expect(retrieveRagJob).toHaveBeenCalled();
			const state = useWizardStore.getState();
			expect(state.grantTemplateRagJobData).toBeNull();
		});

		it("should handle different job statuses", async () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_job_id: "job-123",
				}),
			});

			const statuses: API.RetrieveRagJob.Http200.ResponseBody["status"][] = [
				"PENDING",
				"PROCESSING",
				"COMPLETED",
				"FAILED",
			];

			useApplicationStore.setState({ application });

			for (const status of statuses) {
				const jobData = RagJobResponseFactory.build({ status });
				vi.mocked(retrieveRagJob).mockResolvedValue(jobData);

				const { checkTemplateRagJobStatus } = useWizardStore.getState();
				await checkTemplateRagJobStatus();

				const state = useWizardStore.getState();
				expect(state.grantTemplateRagJobData?.status).toBe(status);

				vi.clearAllMocks();
			}
		});

		it("should not fetch when no rag_job_id exists", async () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
			});

			useApplicationStore.setState({ application });

			const { checkTemplateRagJobStatus } = useWizardStore.getState();
			await checkTemplateRagJobStatus();

			expect(retrieveRagJob).not.toHaveBeenCalled();
		});
	});

	describe("polling", () => {
		it("should start polling with immediate call", async () => {
			const mockApiFunction = vi.fn().mockResolvedValue(undefined);
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 1000, true);

			expect(mockApiFunction).toHaveBeenCalledTimes(1);

			const updatedState = useWizardStore.getState();
			expect(updatedState.polling.isActive).toBe(true);
			expect(updatedState.polling.intervalId).not.toBe(null);

			updatedState.polling.stop();
		});

		it("should start polling without immediate call", () => {
			const mockApiFunction = vi.fn().mockResolvedValue(undefined);
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 1000, false);

			expect(mockApiFunction).not.toHaveBeenCalled();

			const updatedState = useWizardStore.getState();
			expect(updatedState.polling.isActive).toBe(true);
			expect(updatedState.polling.intervalId).not.toBe(null);

			updatedState.polling.stop();
		});

		it("should stop polling", () => {
			const mockApiFunction = vi.fn().mockResolvedValue(undefined);
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 1000);
			store.polling.stop();

			const updatedState = useWizardStore.getState();
			expect(updatedState.polling.isActive).toBe(false);
			expect(updatedState.polling.intervalId).toBe(null);
		});

		it("should not start polling if already active", () => {
			const mockApiFunction1 = vi.fn().mockResolvedValue(undefined);
			const mockApiFunction2 = vi.fn().mockResolvedValue(undefined);
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

		it("should prevent memory leaks on rapid start/stop", () => {
			const mockApiFunction = vi.fn().mockResolvedValue(undefined);
			const store = useWizardStore.getState();

			for (let i = 0; i < 10; i++) {
				store.polling.start(mockApiFunction, 100);
				store.polling.stop();
			}

			const finalState = useWizardStore.getState();
			expect(finalState.polling.isActive).toBe(false);
			expect(finalState.polling.intervalId).toBe(null);
		});

		it("should handle polling function errors gracefully", async () => {
			const mockApiFunction = vi.fn().mockRejectedValue(new Error("API Error"));
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 100, true);

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(mockApiFunction).toHaveBeenCalled();

			const state = useWizardStore.getState();
			expect(state.polling.isActive).toBe(true);

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

		it("should trigger template generation when moving from APPLICATION_DETAILS step", async () => {
			const mockGenerateTemplate = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...GrantTemplateFactory.build(),
					grant_sections: [],
				},
			});

			useApplicationStore.setState({ application });
			vi.spyOn(useApplicationStore.getState(), "generateTemplate").mockImplementation(mockGenerateTemplate);

			const { toNextStep } = useWizardStore.getState();
			toNextStep();

			expect(mockGenerateTemplate).toHaveBeenCalledWith(application.grant_template!.id);
		});

		it("should handle navigation during active polling", () => {
			const mockApiFunction = vi.fn().mockResolvedValue(undefined);
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 1000);

			store.toNextStep();

			const state = useWizardStore.getState();
			expect(state.currentStep).toBe(WizardStep.APPLICATION_STRUCTURE);
			expect(state.polling.isActive).toBe(true);

			store.polling.stop();
		});

		it("should handle concurrent navigation calls", async () => {
			const initialStep = WizardStep.APPLICATION_DETAILS;
			useWizardStore.setState({ currentStep: initialStep });

			const { toNextStep } = useWizardStore.getState();

			await Promise.all([
				Promise.resolve(toNextStep()),
				Promise.resolve(toNextStep()),
				Promise.resolve(toNextStep()),
			]);

			const finalState = useWizardStore.getState();
			expect(finalState.currentStep).toBe(WizardStep.RESEARCH_PLAN);
		});
	});

	describe("handleTitleChange", () => {
		it("should call updateApplication on application store", () => {
			const mockUpdateApplication = vi.fn();
			const application = ApplicationFactory.build({
				project_id: "project-123",
				title: "Old Title",
			});

			useApplicationStore.setState({ application });
			vi.spyOn(useApplicationStore.getState(), "updateApplication").mockImplementation(mockUpdateApplication);

			const { handleTitleChange } = useWizardStore.getState();
			handleTitleChange("New Title");

			expect(mockUpdateApplication).toHaveBeenCalledWith({ title: "New Title" });
		});

		it("should handle errors in title change gracefully", () => {
			const mockUpdateApplication = vi.fn().mockRejectedValue(new Error("Update failed"));
			const application = ApplicationFactory.build({
				title: "Old Title",
				project_id: "project-123",
			});

			useApplicationStore.setState({ application });
			vi.spyOn(useApplicationStore.getState(), "updateApplication").mockImplementation(mockUpdateApplication);

			const { handleTitleChange } = useWizardStore.getState();

			expect(() => handleTitleChange("New Title")).not.toThrow();
			expect(mockUpdateApplication).toHaveBeenCalledWith({ title: "New Title" });
		});

		it("should handle null application gracefully", () => {
			useApplicationStore.setState({ application: null });

			const { handleTitleChange } = useWizardStore.getState();

			expect(() => handleTitleChange("New Title")).not.toThrow();
		});
	});

	describe("async operation testing", () => {
		it("should handle concurrent checkTemplateRagJobStatus calls", async () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_job_id: "job-123",
				}),
			});

			let callCount = 0;
			vi.mocked(retrieveRagJob).mockImplementation(async () => {
				callCount++;
				await new Promise((resolve) => setTimeout(resolve, 50));
				return RagJobResponseFactory.build({ status: "PROCESSING" });
			});

			useApplicationStore.setState({ application });
			const { checkTemplateRagJobStatus } = useWizardStore.getState();

			await Promise.all([checkTemplateRagJobStatus(), checkTemplateRagJobStatus(), checkTemplateRagJobStatus()]);

			expect(callCount).toBe(3);
		});

		it("should handle network timeout scenarios", async () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_job_id: "job-123",
				}),
			});

			vi.mocked(retrieveRagJob).mockImplementation(async () => {
				await new Promise((_resolve, reject) => setTimeout(() => reject(new Error("Timeout")), 100));
				return RagJobResponseFactory.build({ status: "PROCESSING" });
			});

			useApplicationStore.setState({ application });
			const { checkTemplateRagJobStatus } = useWizardStore.getState();

			await checkTemplateRagJobStatus();

			const state = useWizardStore.getState();
			expect(state.grantTemplateRagJobData).toBeNull();
		});

		it("should handle race conditions in polling operations", async () => {
			const mockApiFunction = vi.fn().mockResolvedValue(undefined);
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 100);

			store.polling.stop();
			store.polling.start(mockApiFunction, 100);

			await new Promise((resolve) => setTimeout(resolve, 150));

			const state = useWizardStore.getState();
			expect(state.polling.isActive).toBe(true);

			store.polling.stop();
		});
	});

	describe("reset", () => {
		it("should reset to initial state and clear polling", () => {
			const mockApiFunction = vi.fn().mockResolvedValue(undefined);
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 1000);
			useWizardStore.setState({
				currentStep: WizardStep.KNOWLEDGE_BASE,
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			store.reset();

			const state = useWizardStore.getState();
			expect(state.currentStep).toBe(WizardStep.APPLICATION_DETAILS);
			expect(state.grantTemplateRagJobData).toBeNull();
			expect(state.polling.isActive).toBe(false);
			expect(state.polling.intervalId).toBe(null);
		});

		it("should handle reset during active operations", async () => {
			const mockApiFunction = vi.fn().mockResolvedValue(undefined);
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 100);
			const checkPromise = store.checkTemplateRagJobStatus();

			store.reset();

			await Promise.allSettled([checkPromise]);

			const state = useWizardStore.getState();
			expect(state.currentStep).toBe(WizardStep.APPLICATION_DETAILS);
			expect(state.polling.isActive).toBe(false);
		});
	});
});