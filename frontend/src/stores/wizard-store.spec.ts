import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory, ApplicationWithTemplateFactory, RagSourceFactory } from "::testing/factories";

import { useApplicationStore } from "./application-store";
import { MIN_TITLE_LENGTH, useWizardStore } from "./wizard-store";

// Mock the application store
vi.mock("./application-store", () => ({
	useApplicationStore: {
		getState: vi.fn(),
	},
}));

describe("validateStepNext", () => {
	beforeEach(() => {
		const { polling } = useWizardStore.getState();
		useWizardStore.setState({
			currentStep: 0,
			polling: {
				...polling,
				intervalId: null,
				isActive: false,
			},
		});
		vi.mocked(useApplicationStore.getState).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: null,
			areFilesOrUrlsIndexing: vi.fn(),
			createApplication: vi.fn(),
			generateTemplate: vi.fn(),
			handleApplicationInit: vi.fn(),
			isLoading: true,
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
			retrieveApplication: vi.fn(),
			setApplication: vi.fn(),
			setUploadedFiles: vi.fn(),
			setUrls: vi.fn(),
			updateApplication: vi.fn(),
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
			vi.mocked(useApplicationStore.getState).mockReturnValue({
				addFile: vi.fn(),
				addUrl: vi.fn(),
				application,
				areFilesOrUrlsIndexing: vi.fn(),
				createApplication: vi.fn(),
				generateTemplate: vi.fn(),
				handleApplicationInit: vi.fn(),
				isLoading: true,
				removeFile: vi.fn(),
				removeUrl: vi.fn(),
				retrieveApplication: vi.fn(),
				setApplication: vi.fn(),
				setUploadedFiles: vi.fn(),
				setUrls: vi.fn(),
				updateApplication: vi.fn(),
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
			vi.mocked(useApplicationStore.getState).mockReturnValue({
				addFile: vi.fn(),
				addUrl: vi.fn(),
				application,
				areFilesOrUrlsIndexing: vi.fn(),
				createApplication: vi.fn(),
				generateTemplate: vi.fn(),
				handleApplicationInit: vi.fn(),
				isLoading: false,
				removeFile: vi.fn(),
				removeUrl: vi.fn(),
				retrieveApplication: vi.fn(),
				setApplication: vi.fn(),
				setUploadedFiles: vi.fn(),
				setUrls: vi.fn(),
				updateApplication: vi.fn(),
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
			vi.mocked(useApplicationStore.getState).mockReturnValue({
				addFile: vi.fn(),
				addUrl: vi.fn(),
				application,
				areFilesOrUrlsIndexing: vi.fn(),
				createApplication: vi.fn(),
				generateTemplate: vi.fn(),
				handleApplicationInit: vi.fn(),
				isLoading: false,
				removeFile: vi.fn(),
				removeUrl: vi.fn(),
				retrieveApplication: vi.fn(),
				setApplication: vi.fn(),
				setUploadedFiles: vi.fn(),
				setUrls: vi.fn(),
				updateApplication: vi.fn(),
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
			vi.mocked(useApplicationStore.getState).mockReturnValue({
				addFile: vi.fn(),
				addUrl: vi.fn(),
				application,
				areFilesOrUrlsIndexing: vi.fn(),
				createApplication: vi.fn(),
				generateTemplate: vi.fn(),
				handleApplicationInit: vi.fn(),
				isLoading: false,
				removeFile: vi.fn(),
				removeUrl: vi.fn(),
				retrieveApplication: vi.fn(),
				setApplication: vi.fn(),
				setUploadedFiles: vi.fn(),
				setUrls: vi.fn(),
				updateApplication: vi.fn(),
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
			vi.mocked(useApplicationStore.getState).mockReturnValue({
				addFile: vi.fn(),
				addUrl: vi.fn(),
				application,
				areFilesOrUrlsIndexing: vi.fn(),
				createApplication: vi.fn(),
				generateTemplate: vi.fn(),
				handleApplicationInit: vi.fn(),
				isLoading: false,
				removeFile: vi.fn(),
				removeUrl: vi.fn(),
				retrieveApplication: vi.fn(),
				setApplication: vi.fn(),
				setUploadedFiles: vi.fn(),
				setUrls: vi.fn(),
				updateApplication: vi.fn(),
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
			vi.mocked(useApplicationStore.getState).mockReturnValue({
				addFile: vi.fn(),
				addUrl: vi.fn(),
				application,
				areFilesOrUrlsIndexing: vi.fn(),
				createApplication: vi.fn(),
				generateTemplate: vi.fn(),
				handleApplicationInit: vi.fn(),
				isLoading: false,
				removeFile: vi.fn(),
				removeUrl: vi.fn(),
				retrieveApplication: vi.fn(),
				setApplication: vi.fn(),
				setUploadedFiles: vi.fn(),
				setUrls: vi.fn(),
				updateApplication: vi.fn(),
				uploadedFiles: [],
				urls: [],
			});
			useWizardStore.setState({ currentStep: 1 });

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(true);
		});

		it("should return false when grant template is null", () => {
			const application = ApplicationFactory.build();
			vi.mocked(useApplicationStore.getState).mockReturnValue({
				addFile: vi.fn(),
				addUrl: vi.fn(),
				application,
				areFilesOrUrlsIndexing: vi.fn(),
				createApplication: vi.fn(),
				generateTemplate: vi.fn(),
				handleApplicationInit: vi.fn(),
				isLoading: false,
				removeFile: vi.fn(),
				removeUrl: vi.fn(),
				retrieveApplication: vi.fn(),
				setApplication: vi.fn(),
				setUploadedFiles: vi.fn(),
				setUrls: vi.fn(),
				updateApplication: vi.fn(),
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
		it("should return true when rag sources exist and none have failed", () => {
			const ragSources = RagSourceFactory.batch(3, { status: "FINISHED" });
			const application = ApplicationFactory.build({ rag_sources: ragSources });
			vi.mocked(useApplicationStore.getState).mockReturnValue({
				addFile: vi.fn(),
				addUrl: vi.fn(),
				application,
				areFilesOrUrlsIndexing: vi.fn(),
				createApplication: vi.fn(),
				generateTemplate: vi.fn(),
				handleApplicationInit: vi.fn(),
				isLoading: false,
				removeFile: vi.fn(),
				removeUrl: vi.fn(),
				retrieveApplication: vi.fn(),
				setApplication: vi.fn(),
				setUploadedFiles: vi.fn(),
				setUrls: vi.fn(),
				updateApplication: vi.fn(),
				uploadedFiles: [],
				urls: [],
			});
			useWizardStore.setState({ currentStep: 2 });

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
			vi.mocked(useApplicationStore.getState).mockReturnValue({
				addFile: vi.fn(),
				addUrl: vi.fn(),
				application,
				areFilesOrUrlsIndexing: vi.fn(),
				createApplication: vi.fn(),
				generateTemplate: vi.fn(),
				handleApplicationInit: vi.fn(),
				isLoading: false,
				removeFile: vi.fn(),
				removeUrl: vi.fn(),
				retrieveApplication: vi.fn(),
				setApplication: vi.fn(),
				setUploadedFiles: vi.fn(),
				setUrls: vi.fn(),
				updateApplication: vi.fn(),
				uploadedFiles: [],
				urls: [],
			});
			useWizardStore.setState({ currentStep: 2 });

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});

		it("should return false when no rag sources exist", () => {
			const application = ApplicationFactory.build({ rag_sources: [] });
			vi.mocked(useApplicationStore.getState).mockReturnValue({
				addFile: vi.fn(),
				addUrl: vi.fn(),
				application,
				areFilesOrUrlsIndexing: vi.fn(),
				createApplication: vi.fn(),
				generateTemplate: vi.fn(),
				handleApplicationInit: vi.fn(),
				isLoading: false,
				removeFile: vi.fn(),
				removeUrl: vi.fn(),
				retrieveApplication: vi.fn(),
				setApplication: vi.fn(),
				setUploadedFiles: vi.fn(),
				setUrls: vi.fn(),
				updateApplication: vi.fn(),
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
		it("should return false for steps beyond 2", () => {
			const application = ApplicationFactory.build();
			vi.mocked(useApplicationStore.getState).mockReturnValue({
				addFile: vi.fn(),
				addUrl: vi.fn(),
				application,
				areFilesOrUrlsIndexing: vi.fn(),
				createApplication: vi.fn(),
				generateTemplate: vi.fn(),
				handleApplicationInit: vi.fn(),
				isLoading: false,
				removeFile: vi.fn(),
				removeUrl: vi.fn(),
				retrieveApplication: vi.fn(),
				setApplication: vi.fn(),
				setUploadedFiles: vi.fn(),
				setUrls: vi.fn(),
				updateApplication: vi.fn(),
				uploadedFiles: [],
				urls: [],
			});
			useWizardStore.setState({ currentStep: 3 });

			const { validateStepNext } = useWizardStore.getState();
			const result = validateStepNext();
			expect(result).toBe(false);
		});
	});
});

describe("wizard store functionality", () => {
	beforeEach(() => {
		const { polling } = useWizardStore.getState();
		useWizardStore.setState({
			currentStep: 0,
			polling: {
				...polling,
				intervalId: null,
				isActive: false,
			},
		});
	});

	describe("setCurrentStep", () => {
		it("should set the current step", () => {
			const { setCurrentStep } = useWizardStore.getState();
			setCurrentStep(2);
			expect(useWizardStore.getState().currentStep).toBe(2);
		});

		it("should clamp step to valid range", () => {
			const { setCurrentStep } = useWizardStore.getState();
			setCurrentStep(-1);
			expect(useWizardStore.getState().currentStep).toBe(0);
			setCurrentStep(100);
			expect(useWizardStore.getState().currentStep).toBe(5); // WIZARD_STEP_TITLES.length - 1
		});
	});

	describe("toPreviousStep", () => {
		it("should go to previous step", () => {
			useWizardStore.setState({ currentStep: 2 });
			const { toPreviousStep } = useWizardStore.getState();
			toPreviousStep();
			expect(useWizardStore.getState().currentStep).toBe(1);
		});

		it("should not go below 0", () => {
			useWizardStore.setState({ currentStep: 0 });
			const { toPreviousStep } = useWizardStore.getState();
			toPreviousStep();
			expect(useWizardStore.getState().currentStep).toBe(0);
		});
	});
});
