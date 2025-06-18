import { beforeEach, describe, expect, it } from "vitest";

import { ApplicationFactory, ApplicationWithTemplateFactory, RagSourceFactory } from "::testing/factories";

import { useApplicationStore } from "./application-store";
import { MIN_TITLE_LENGTH, useWizardStore } from "./wizard-store";

describe("validateStepNext", () => {
	beforeEach(() => {
		useWizardStore.setState({
			currentStep: 0,
		});

		useApplicationStore.setState({
			application: null,
			isLoading: true,
			uploadedFiles: [],
			urls: [],
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
			useApplicationStore.setState({
				application,
				isLoading: true,
				uploadedFiles: [],
				urls: [],
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});

	describe("step 0 validation", () => {
		it("should return true when title is long enough and has URLs", () => {
			const application = ApplicationFactory.build({
				title: "A".repeat(MIN_TITLE_LENGTH),
			});
			useApplicationStore.setState({
				application,
				isLoading: false,
				uploadedFiles: [],
				urls: ["https://example.com"],
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return true when title is long enough and has files", () => {
			const application = ApplicationFactory.build({
				title: "A".repeat(MIN_TITLE_LENGTH),
			});
			useApplicationStore.setState({
				application,
				isLoading: false,
				uploadedFiles: [{ name: "test.pdf", size: 100 } as any],
				urls: [],
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return false when title is too short", () => {
			const application = ApplicationFactory.build({
				title: "A".repeat(MIN_TITLE_LENGTH - 1),
			});
			useApplicationStore.setState({
				application,
				isLoading: false,
				uploadedFiles: [{ name: "test.pdf", size: 100 } as any],
				urls: ["https://example.com"],
			});

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});

		it("should return false when neither URLs nor files are present", () => {
			const application = ApplicationFactory.build({
				title: "A".repeat(MIN_TITLE_LENGTH),
			});
			useApplicationStore.setState({
				application,
				isLoading: false,
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
			useApplicationStore.setState({
				application,
				isLoading: false,
				uploadedFiles: [],
				urls: [],
			});
			useWizardStore.setState({ currentStep: 1 });

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return false when grant template is null", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
			});
			useApplicationStore.setState({
				application,
				isLoading: false,
				uploadedFiles: [],
				urls: [],
			});
			useWizardStore.setState({ currentStep: 1 });

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});

	describe("step 2 validation", () => {
		it("should return true when all sources are not failed", () => {
			const ragSources = [
				RagSourceFactory.build({ status: "FINISHED" }),
				RagSourceFactory.build({ status: "FINISHED" }),
			];
			const application = ApplicationFactory.build({
				rag_sources: ragSources,
			});
			useApplicationStore.setState({
				application,
				isLoading: false,
				uploadedFiles: [],
				urls: [],
			});
			useWizardStore.setState({ currentStep: 2 });

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return false when some sources have failed", () => {
			const ragSources = [
				RagSourceFactory.build({ status: "FINISHED" }),
				RagSourceFactory.build({ status: "FAILED" }),
			];
			const application = ApplicationFactory.build({
				rag_sources: ragSources,
			});
			useApplicationStore.setState({
				application,
				isLoading: false,
				uploadedFiles: [],
				urls: [],
			});
			useWizardStore.setState({ currentStep: 2 });

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});

		it("should return false when there are no RAG sources", () => {
			const application = ApplicationFactory.build({
				rag_sources: [],
			});
			useApplicationStore.setState({
				application,
				isLoading: false,
				uploadedFiles: [],
				urls: [],
			});
			useWizardStore.setState({ currentStep: 2 });

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});

	describe("unknown step", () => {
		it("should return false", () => {
			const application = ApplicationFactory.build();
			useApplicationStore.setState({
				application,
				isLoading: false,
				uploadedFiles: [],
				urls: [],
			});
			useWizardStore.setState({ currentStep: 999 });

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});
});
