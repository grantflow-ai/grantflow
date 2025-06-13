import { beforeEach, describe, expect, it } from "vitest";

import { ApplicationFactory, ApplicationWithTemplateFactory, RagSourceFactory } from "::testing/factories";

import { MIN_TITLE_LENGTH, useWizardStore } from "./wizard-store";

describe("validateStepNext", () => {
	beforeEach(() => {
		useWizardStore.setState({
			application: null,
			applicationId: null,
			applicationTitle: "",
			connectionStatus: undefined,
			connectionStatusColor: undefined,
			currentStep: 0,
			isCreatingApplication: true,
			isGeneratingTemplate: false,
			templateId: null,
			ui: {
				fileDropdownStates: {},
				linkHoverStates: {},
				urlInput: "",
			},
			uploadedFiles: [],
			urls: [],
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

	describe("when isGeneratingTemplate is true", () => {
		it("should return false", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({
				application,
				isGeneratingTemplate: true,
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
				application,
				applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
				currentStep: 0,
				uploadedFiles: [],
				urls: ["https://example.com"],
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return true when title is long enough and has files", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({
				application,
				applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
				currentStep: 0,
				uploadedFiles: [{ name: "test.pdf", size: 100 } as any],
				urls: [],
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return true when title is long enough and has both URLs and files", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({
				application,
				applicationTitle: "A".repeat(MIN_TITLE_LENGTH),
				currentStep: 0,
				uploadedFiles: [{ name: "test.pdf", size: 100 } as any],
				urls: ["https://example.com"],
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
				application,
				currentStep: 0,
				uploadedFiles: [{ name: "test.pdf", size: 100 } as any],
				urls: ["https://example.com"],
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});

		it("should trim whitespace from title", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({
				application,
				applicationTitle: `   ${"A".repeat(MIN_TITLE_LENGTH)}   `,
				currentStep: 0,
				uploadedFiles: [],
				urls: ["https://example.com"],
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
				application,
				currentStep: 0,
				uploadedFiles: [],
				urls: [],
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
				application,
				currentStep: 1,
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return false when grant template is null", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({
				application,
				currentStep: 1,
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
				application,
				currentStep: 1,
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});

	describe("step 2 validation", () => {
		it("should return true when rag sources exist and none have failed", () => {
			const ragSources = RagSourceFactory.batch(3, { status: "FINISHED" });
			const application = ApplicationFactory.build({ rag_sources: ragSources });
			useWizardStore.setState({
				application,
				currentStep: 2,
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
			const application = ApplicationFactory.build({ rag_sources: ragSources });
			useWizardStore.setState({
				application,
				currentStep: 2,
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
			const application = ApplicationFactory.build({ rag_sources: ragSources });
			useWizardStore.setState({
				application,
				currentStep: 2,
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});

		it("should return false when no rag sources exist", () => {
			const application = ApplicationFactory.build({ rag_sources: [] });
			useWizardStore.setState({
				application,
				currentStep: 2,
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
				application,
				currentStep: 3,
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});
});
