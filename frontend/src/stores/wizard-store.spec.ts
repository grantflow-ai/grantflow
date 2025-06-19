import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	FileWithIdFactory,
	GrantTemplateFactory,
	RagSourceFactory,
} from "::testing/factories";
import * as grantApplicationActions from "@/actions/grant-applications";
import * as grantTemplateActions from "@/actions/grant-template";

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

		// Reset wizard store state only (not actions)
		const wizardState = useWizardStore.getState();
		useWizardStore.setState({
			polling: {
				...wizardState.polling,
				intervalId: null,
				isActive: false,
			},
			ui: {
				currentStep: 0,
				fileDropdownStates: {},
				linkHoverStates: {},
				urlInput: "",
			},
			workspaceId: "",
			wsConnectionStatus: undefined,
			wsConnectionStatusColor: undefined,
		});

		// Reset application store
		useApplicationStore.setState({
			application: null,
			applicationTitle: "",
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});
	});

	describe("handleTitleChange", () => {
		it("should update title immediately", () => {
			const application = ApplicationFactory.build();

			// Set up real application store state
			useApplicationStore.setState({
				application,
				applicationTitle: application.title,
			});

			useWizardStore.setState({ workspaceId: "workspace-123" });

			const { handleTitleChange } = useWizardStore.getState();

			// Call handleTitleChange
			handleTitleChange("New Title");

			// Should immediately update local state
			expect(useApplicationStore.getState().applicationTitle).toBe("New Title");
		});

		it("should debounce backend update", async () => {
			const application = ApplicationFactory.build({ title: "Old Title" });
			const updatedApplication = { ...application, title: "New Title" };
			vi.mocked(grantApplicationActions.updateApplication).mockResolvedValue(updatedApplication);

			// Set up real application store state
			useApplicationStore.setState({
				application,
				applicationTitle: application.title,
			});

			useWizardStore.setState({ workspaceId: "workspace-123" });

			// Trigger the title change through the application store action
			await useApplicationStore.getState().updateApplicationTitle("workspace-123", application.id, "New Title");

			// Should have called the mocked action
			expect(grantApplicationActions.updateApplication).toHaveBeenCalledWith("workspace-123", application.id, {
				title: "New Title",
			});

			// Should have updated the store
			expect(useApplicationStore.getState().application?.title).toBe("New Title");
			expect(useApplicationStore.getState().applicationTitle).toBe("New Title");
		});

		it("should not update backend if title is same as current", async () => {
			const application = ApplicationFactory.build({ title: "Current Title" });
			vi.mocked(grantApplicationActions.updateApplication).mockResolvedValue(application);

			// Set up real application store state
			useApplicationStore.setState({
				application,
				applicationTitle: application.title,
			});

			useWizardStore.setState({ workspaceId: "workspace-123" });

			const { handleTitleChange } = useWizardStore.getState();

			// Call with same title
			handleTitleChange("Current Title");

			// Should update local state
			expect(useApplicationStore.getState().applicationTitle).toBe("Current Title");

			// Wait for potential debounce
			await new Promise((resolve) => setTimeout(resolve, 600));

			// Backend should not be called for same title
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
					uploadedFiles: [],
					urls: [],
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});
		});

		describe("step 0 validation", () => {
			beforeEach(() => {
				useWizardStore.setState({
					ui: { ...useWizardStore.getState().ui, currentStep: 0 },
				});
			});

			it("should return true when title is long enough and has URLs", () => {
				const application = ApplicationFactory.build();
				useApplicationStore.setState({
					application,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					isLoading: false,
					uploadedFiles: [],
					urls: ["https://example.com"],
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
					uploadedFiles: [FileWithIdFactory.build()],
					urls: [],
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
					uploadedFiles: [FileWithIdFactory.build()],
					urls: ["https://example.com"],
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
					uploadedFiles: [FileWithIdFactory.build()],
					urls: ["https://example.com"],
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
					uploadedFiles: [],
					urls: ["https://example.com"],
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
					uploadedFiles: [],
					urls: [],
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});
		});

		describe("step 1 validation", () => {
			beforeEach(() => {
				useWizardStore.setState({
					ui: { ...useWizardStore.getState().ui, currentStep: 1 },
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
					ui: { ...useWizardStore.getState().ui, currentStep: 2 },
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
					ui: { ...useWizardStore.getState().ui, currentStep: 3 },
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

			// Should call immediately
			expect(mockApiFunction).toHaveBeenCalledTimes(1);

			// Should set active state
			const updatedState = useWizardStore.getState();
			expect(updatedState.polling.isActive).toBe(true);
			expect(updatedState.polling.intervalId).not.toBe(null);

			// Cleanup
			updatedState.polling.stop();
		});

		it("should start polling without immediate call", () => {
			const mockApiFunction = vi.fn();
			const store = useWizardStore.getState();

			store.polling.start(mockApiFunction, 1000, false);

			// Should not call immediately
			expect(mockApiFunction).not.toHaveBeenCalled();

			// Should set active state
			const updatedState = useWizardStore.getState();
			expect(updatedState.polling.isActive).toBe(true);
			expect(updatedState.polling.intervalId).not.toBe(null);

			// Cleanup
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

			// Should not change interval
			expect(firstIntervalId).toBe(secondIntervalId);
			expect(mockApiFunction1).toHaveBeenCalledTimes(1);
			expect(mockApiFunction2).not.toHaveBeenCalled();

			// Cleanup
			store.polling.stop();
		});
	});

	describe("navigation", () => {
		it("should navigate to next step", () => {
			const { toNextStep } = useWizardStore.getState();

			toNextStep();
			expect(useWizardStore.getState().ui.currentStep).toBe(1);

			toNextStep();
			expect(useWizardStore.getState().ui.currentStep).toBe(2);
		});

		it("should not navigate beyond last step", () => {
			useWizardStore.setState({
				ui: { ...useWizardStore.getState().ui, currentStep: 5 },
			});

			const { toNextStep } = useWizardStore.getState();
			toNextStep();

			expect(useWizardStore.getState().ui.currentStep).toBe(5);
		});

		it("should navigate to previous step", () => {
			useWizardStore.setState({
				ui: { ...useWizardStore.getState().ui, currentStep: 2 },
			});

			const { toPreviousStep } = useWizardStore.getState();

			toPreviousStep();
			expect(useWizardStore.getState().ui.currentStep).toBe(1);

			toPreviousStep();
			expect(useWizardStore.getState().ui.currentStep).toBe(0);
		});

		it("should not navigate before first step", () => {
			const { toPreviousStep } = useWizardStore.getState();
			toPreviousStep();

			expect(useWizardStore.getState().ui.currentStep).toBe(0);
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

			useWizardStore.setState({ workspaceId: "workspace-123" });

			const { toNextStep } = useWizardStore.getState();
			toNextStep();

			// Give time for the async action to be called
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(grantTemplateActions.generateGrantTemplate).toHaveBeenCalledWith(
				application.workspace_id,
				application.id,
				application.grant_template!.id,
			);
		});
	});

	describe("UI state management", () => {
		it("should set file dropdown state", () => {
			const { setFileDropdownOpen } = useWizardStore.getState();

			setFileDropdownOpen("file-1", true);
			expect(useWizardStore.getState().ui.fileDropdownStates["file-1"]).toBe(true);

			setFileDropdownOpen("file-1", false);
			expect(useWizardStore.getState().ui.fileDropdownStates["file-1"]).toBe(false);
		});

		it("should set link hover state", () => {
			const { setLinkHoverState } = useWizardStore.getState();

			setLinkHoverState("https://example.com", true);
			expect(useWizardStore.getState().ui.linkHoverStates["https://example.com"]).toBe(true);

			setLinkHoverState("https://example.com", false);
			expect(useWizardStore.getState().ui.linkHoverStates["https://example.com"]).toBe(false);
		});

		it("should set URL input", () => {
			const { setUrlInput } = useWizardStore.getState();

			setUrlInput("https://example.com");
			expect(useWizardStore.getState().ui.urlInput).toBe("https://example.com");
		});

		it("should set workspace ID", () => {
			const { setWorkspaceId } = useWizardStore.getState();

			setWorkspaceId("workspace-123");
			expect(useWizardStore.getState().workspaceId).toBe("workspace-123");
		});
	});
});
