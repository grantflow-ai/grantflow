import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantTemplateFactory,
	RagSourceFactory,
} from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useApplicationStore } from "./application-store";
import { MIN_TITLE_LENGTH, useWizardStore } from "./wizard-store";

// Mock the application store
vi.mock("./application-store");

describe("wizard store", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset wizard store
		useWizardStore.setState({
			polling: {
				intervalId: null,
				isActive: false,
				start: vi.fn(),
				stop: vi.fn(),
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
		it("should update title immediately and debounce backend update", async () => {
			const mockSetApplicationTitle = vi.fn();
			const mockUpdateApplicationTitle = vi.fn();
			const application = ApplicationFactory.build();

			vi.mocked(useApplicationStore.getState).mockReturnValue({
				...useApplicationStore.getState(),
				application,
				setApplicationTitle: mockSetApplicationTitle,
				updateApplicationTitle: mockUpdateApplicationTitle,
			} as any);

			useWizardStore.setState({ workspaceId: "workspace-123" });

			const { handleTitleChange } = useWizardStore.getState();

			// Call handleTitleChange
			handleTitleChange("New Title");

			// Should immediately update local state
			expect(mockSetApplicationTitle).toHaveBeenCalledWith("New Title");

			// Backend update should be debounced
			expect(mockUpdateApplicationTitle).not.toHaveBeenCalled();

			// Wait for debounce
			await new Promise((resolve) => setTimeout(resolve, 600));

			// Now backend update should have been called
			expect(mockUpdateApplicationTitle).toHaveBeenCalledWith("workspace-123", application.id, "New Title");
		});

		it("should not update backend if title is same as current", async () => {
			const mockSetApplicationTitle = vi.fn();
			const mockUpdateApplicationTitle = vi.fn();
			const application = ApplicationFactory.build({ title: "Current Title" });

			vi.mocked(useApplicationStore.getState).mockReturnValue({
				...useApplicationStore.getState(),
				application,
				setApplicationTitle: mockSetApplicationTitle,
				updateApplicationTitle: mockUpdateApplicationTitle,
			} as any);

			useWizardStore.setState({ workspaceId: "workspace-123" });

			const { handleTitleChange } = useWizardStore.getState();

			// Call with same title
			handleTitleChange("Current Title");

			// Should update local state
			expect(mockSetApplicationTitle).toHaveBeenCalledWith("Current Title");

			// Wait for potential debounce
			await new Promise((resolve) => setTimeout(resolve, 600));

			// Backend should not be called for same title
			expect(mockUpdateApplicationTitle).not.toHaveBeenCalled();
		});
	});

	describe("validateStepNext", () => {
		describe("when application is null", () => {
			it("should return false", () => {
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application: null,
				} as any);

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
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					uploadedFiles: [],
					urls: ["https://example.com"],
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return true when title is long enough and has files", () => {
				const application = ApplicationFactory.build();
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					uploadedFiles: [{ name: "test.pdf", size: 100 } as any],
					urls: [],
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return true when title is long enough and has both URLs and files", () => {
				const application = ApplicationFactory.build();
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					uploadedFiles: [{ name: "test.pdf", size: 100 } as any],
					urls: ["https://example.com"],
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return false when title is too short", () => {
				const application = ApplicationFactory.build();
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH - 1),
					uploadedFiles: [{ name: "test.pdf", size: 100 } as any],
					urls: ["https://example.com"],
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should trim whitespace from title", () => {
				const application = ApplicationFactory.build();
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
					applicationTitle: `   ${"A".repeat(MIN_TITLE_LENGTH)}   `,
					uploadedFiles: [],
					urls: ["https://example.com"],
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return false when neither URLs nor files are present", () => {
				const application = ApplicationFactory.build();
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					uploadedFiles: [],
					urls: [],
				} as any);

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
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(true);
			});

			it("should return false when grant template is null", () => {
				const application = ApplicationFactory.build({ grant_template: undefined });
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
				} as any);

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
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
				} as any);

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
					grant_template: GrantTemplateFactory.build({ rag_sources: ragSources }),
				});
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
				} as any);

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
					grant_template: GrantTemplateFactory.build({ rag_sources: ragSources }),
				});
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
				} as any);

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
					grant_template: GrantTemplateFactory.build({ rag_sources: ragSources }),
				});
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});

			it("should return false when no rag sources exist", () => {
				const application = ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ rag_sources: [] }),
				});
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
				} as any);

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});
		});

		describe("unknown step", () => {
			it("should return false for steps beyond 2", () => {
				const application = ApplicationFactory.build();
				vi.mocked(useApplicationStore.getState).mockReturnValue({
					...useApplicationStore.getState(),
					application,
				} as any);

				useWizardStore.setState({
					ui: { ...useWizardStore.getState().ui, currentStep: 3 },
				});

				const { validateStepNext } = useWizardStore.getState();
				expect(validateStepNext()).toBe(false);
			});
		});
	});

	describe.skip("polling", () => {
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

		it("should trigger template generation when moving from step 0 to 1", () => {
			const mockGenerateTemplate = vi.fn();
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...GrantTemplateFactory.build(),
					grant_sections: [],
				},
			});

			vi.mocked(useApplicationStore.getState).mockReturnValue({
				...useApplicationStore.getState(),
				application,
				generateTemplate: mockGenerateTemplate,
			} as any);

			useWizardStore.setState({ workspaceId: "workspace-123" });

			const { toNextStep } = useWizardStore.getState();
			toNextStep();

			expect(mockGenerateTemplate).toHaveBeenCalledWith(application.grant_template!.id);
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
