import { beforeEach, describe, expect, it } from "vitest";

import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantTemplateFactory,
	RagSourceFactory,
} from "::testing/factories";

import { MIN_TITLE_LENGTH, useWizardStore } from "./wizard-store";

describe("validateStepNext", () => {
	beforeEach(() => {
		useWizardStore.setState({
			applicationState: {
				application: null,
				applicationId: null,
				applicationTitle: "",
				templateId: null,
				wsConnectionStatus: undefined,
				wsConnectionStatusColor: undefined,
			},
			contentState: {
				uploadedFiles: [],
				urls: [],
			},
			isLoading: true,
			ui: {
				currentStep: 0,
				fileDropdownStates: {},
				linkHoverStates: {},
				urlInput: "",
			},
			workspaceId: "",
		});
	});

	describe("when application is null", () => {
		it("should return false", () => {
			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});

	describe("when isLoading is true", () => {
		it("should return false", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "",
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				isLoading: true,
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});

	describe("step 0 validation", () => {
		it("should return true when title is long enough and has URLs", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				contentState: {
					uploadedFiles: [],
					urls: ["https://example.com"],
				},
				isLoading: false,
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return true when title is long enough and has files", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				contentState: {
					uploadedFiles: [{ name: "test.pdf", size: 100 } as any],
					urls: [],
				},
				isLoading: false,
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return true when title is long enough and has both URLs and files", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				contentState: {
					uploadedFiles: [{ name: "test.pdf", size: 100 } as any],
					urls: ["https://example.com"],
				},
				isLoading: false,
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return false when title is too short", () => {
			const application = ApplicationFactory.build({
				title: "A".repeat(MIN_TITLE_LENGTH - 1),
			});
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH - 1),
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				contentState: {
					uploadedFiles: [{ name: "test.pdf", size: 100 } as any],
					urls: ["https://example.com"],
				},
				isLoading: false,
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});

		it("should trim whitespace from title", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: `   ${"A".repeat(MIN_TITLE_LENGTH)}   `,
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				contentState: {
					uploadedFiles: [],
					urls: ["https://example.com"],
				},
				isLoading: false,
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return false when neither URLs nor files are present", () => {
			const application = ApplicationFactory.build({
				title: "A".repeat(MIN_TITLE_LENGTH),
			});
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				contentState: {
					uploadedFiles: [],
					urls: [],
				},
				isLoading: false,
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});

	describe("step 1 validation", () => {
		it("should return true when grant template has sections", () => {
			const application = ApplicationWithTemplateFactory.build();
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "",
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				isLoading: false,
				ui: {
					currentStep: 1,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return false when grant template is null", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
			});
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "",
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				isLoading: false,
				ui: {
					currentStep: 1,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});

		it("should return false when grant template has no sections", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					created_at: new Date().toISOString(),
					funding_organization: undefined,
					funding_organization_id: undefined,
					grant_application_id: "123",
					grant_sections: [],
					id: "123",
					rag_sources: [],
					submission_date: undefined,
					updated_at: new Date().toISOString(),
				},
			});
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "",
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				isLoading: false,
				ui: {
					currentStep: 1,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});

	describe("step 2 validation", () => {
		it("should return true when rag sources exist and none have failed", () => {
			const ragSources = RagSourceFactory.batch(3, { status: "FINISHED" });
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({ rag_sources: ragSources }),
			});
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "",
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				isLoading: false,
				ui: {
					currentStep: 2,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
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
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "",
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				isLoading: false,
				ui: {
					currentStep: 2,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
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
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "",
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				isLoading: false,
				ui: {
					currentStep: 2,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});

		it("should return false when no rag sources exist", () => {
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({ rag_sources: [] }),
			});
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "",
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				isLoading: false,
				ui: {
					currentStep: 2,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});

	describe("unknown step", () => {
		it("should return false for steps beyond 2", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({
				applicationState: {
					application,
					applicationId: null,
					applicationTitle: "",
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				isLoading: false,
				ui: {
					currentStep: 3,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});
});
