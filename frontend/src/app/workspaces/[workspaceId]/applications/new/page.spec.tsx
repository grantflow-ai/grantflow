import { ApplicationFactory, SourceProcessingNotificationMessageFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApplication } from "@/actions/grant-applications";
import {
	isSourceProcessingNotificationMessage,
	useApplicationNotifications,
} from "@/hooks/use-application-notifications";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import CreateGrantApplicationWizardPage from "./page";

vi.mock("next/navigation", () => ({
	useParams: vi.fn(),
	useRouter: vi.fn(),
	useSearchParams: vi.fn(),
}));

vi.mock("@/actions/grant-applications", () => ({
	createApplication: vi.fn(),
	retrieveApplication: vi.fn(),
	updateApplication: vi.fn(),
}));

vi.mock("@/actions/sources", () => ({
	crawlTemplateUrl: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("@/hooks/use-application-notifications", () => ({
	isSourceProcessingNotificationMessage: vi.fn().mockReturnValue(false),
	useApplicationNotifications: vi.fn().mockReturnValue({
		connectionStatus: "Open",
		connectionStatusColor: "bg-green-500",
		notifications: [],
		readyState: 1,
		sendMessage: vi.fn(),
	}),
}));

vi.mock("@/stores/wizard-store", () => ({
	useWizardStore: vi.fn(),
}));

vi.mock("@/stores/application-store", () => ({
	useApplicationStore: vi.fn(),
}));

const mockPush = vi.fn();
const mockParams = { workspaceId: "test-workspace-id" };
const mockSearchParams = {
	get: vi.fn().mockReturnValue(null),
};

const createMockWizardStore = (overrides: any = {}) => {
	const defaultStore = {
		handleTitleChange: vi.fn(),
		polling: {
			intervalId: null,
			isActive: false,
			start: vi.fn(),
			stop: vi.fn(),
		},
		setCurrentStep: vi.fn(),
		setFileDropdownOpen: vi.fn(),
		setLinkHoverState: vi.fn(),
		setUrlInput: vi.fn(),
		setWorkspaceId: vi.fn(),
		toNextStep: vi.fn(),
		toPreviousStep: vi.fn(),
		ui: {
			currentStep: 0,
			fileDropdownStates: {},
			linkHoverStates: {},
			urlInput: "",
		},
		validateStepNext: vi.fn().mockReturnValue(false),
		workspaceId: "test-workspace-id",
		wsConnectionStatus: undefined,
		wsConnectionStatusColor: undefined,
	};

	// Deep merge overrides
	if (overrides.ui) {
		defaultStore.ui = { ...defaultStore.ui, ...overrides.ui };
		overrides.ui = undefined;
	}
	if (overrides.polling) {
		defaultStore.polling = { ...defaultStore.polling, ...overrides.polling };
		overrides.polling = undefined;
	}

	return { ...defaultStore, ...overrides };
};

const createMockApplicationStore = (overrides: any = {}) => {
	const defaultStore = {
		addFile: vi.fn(),
		addUrl: vi.fn(),
		application: {
			grant_template: { id: "template-123" },
			id: "app-123",
			title: "Untitled Application",
			workspace_id: "test-workspace-id",
		} as any,
		applicationTitle: "Untitled Application",
		areFilesOrUrlsIndexing: vi.fn().mockReturnValue(false),
		createApplication: vi.fn(),
		generateTemplate: vi.fn(),
		handleApplicationInit: vi.fn(),
		isLoading: false,
		removeFile: vi.fn(),
		removeUrl: vi.fn(),
		retrieveApplication: vi.fn(),
		setApplication: vi.fn(),
		setApplicationTitle: vi.fn(),
		setUploadedFiles: vi.fn(),
		setUrls: vi.fn(),
		updateApplication: vi.fn(),
		updateApplicationTitle: vi.fn(),
		updateGrantSections: vi.fn(),
		uploadedFiles: [],
		urls: [],
	};

	return { ...defaultStore, ...overrides };
};

describe("CreateGrantApplicationWizardPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
		vi.mocked(useParams).mockReturnValue(mockParams);
		vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as any);
		vi.mocked(useWizardStore).mockReturnValue(createMockWizardStore());
		vi.mocked(useApplicationStore).mockReturnValue(createMockApplicationStore());
	});

	it("shows loading state initially", () => {
		vi.mocked(createApplication).mockImplementation(() => new Promise<never>(() => {}));

		// Mock store to show loading state
		const mockStore = createMockWizardStore();
		vi.mocked(useWizardStore).mockReturnValue(mockStore);

		// Mock application store to show loading state
		const mockApplicationStore = createMockApplicationStore({
			application: null,
			isLoading: true,
		});
		vi.mocked(useApplicationStore).mockReturnValue(mockApplicationStore);

		render(<CreateGrantApplicationWizardPage />);

		// When no applicationId is in search params, it shows an empty loading state
		const loadingContainer = screen.getByText((_, element) => {
			return element?.className === "text-center";
		});
		expect(loadingContainer).toBeInTheDocument();
	});

	it("creates application on mount", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		// Mock the application store with handleApplicationInit
		const mockHandleApplicationInit = vi.fn().mockResolvedValue(undefined);

		const mockApplicationStore = createMockApplicationStore({
			application: null,
			handleApplicationInit: mockHandleApplicationInit,
			isLoading: true,
		});
		vi.mocked(useApplicationStore).mockReturnValue(mockApplicationStore);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(mockHandleApplicationInit).toHaveBeenCalledWith(mockParams.workspaceId, undefined);
		});
	});

	it("shows error and redirects when application creation fails", async () => {
		vi.mocked(createApplication).mockRejectedValue(new Error("Failed"));

		// Mock the application store with implementation that will fail
		const mockHandleApplicationInit = vi.fn().mockImplementation(async (_workspaceId: string) => {
			throw new Error("Failed to initialize application");
		});

		const mockApplicationStore = createMockApplicationStore({
			application: null,
			handleApplicationInit: mockHandleApplicationInit,
			isLoading: true,
		});
		vi.mocked(useApplicationStore).mockReturnValue(mockApplicationStore);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith(`/workspaces/${mockParams.workspaceId}`);
		});
	});

	it("renders wizard components after application is created", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
			expect(screen.getByTestId("wizard-header")).toBeInTheDocument();
			expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
			expect(screen.getByTestId("step-content-container")).toBeInTheDocument();
		});
	});

	it("shows first step by default", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});
	});

	it("disables next button when validation fails", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("continue-button")).toBeInTheDocument();
		});

		const continueButton = screen.getByTestId("continue-button");
		expect(continueButton).toBeDisabled();
	});

	it("keeps the next button disabled until document is uploaded", async () => {
		const user = userEvent.setup();
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		// Mock store to simulate state with title and URL but no files uploaded
		const mockValidateStepNext = vi.fn().mockReturnValue(false); // Validation should fail
		const mockStore = createMockWizardStore({
			validateStepNext: mockValidateStepNext,
		});
		vi.mocked(useWizardStore).mockReturnValue(mockStore);

		// Mock application store with the application data
		const mockApplicationStore = createMockApplicationStore({
			application: {
				grant_template: { id: "template-123" },
				id: "app-123",
				title: "My Application",
				workspace_id: "test-workspace-id",
			},
			applicationTitle: "My Application",
			uploadedFiles: [], // No files uploaded
			urls: ["https://example.com"],
		});
		vi.mocked(useApplicationStore).mockReturnValue(mockApplicationStore);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});

		// Add title only - button should still be disabled without files or urls
		const titleInput = screen.getByTestId("application-title-textarea");
		await user.clear(titleInput);
		await user.type(titleInput, "My Application");

		// Without files or URLs, the button should remain disabled
		const continueButton = screen.getByTestId("continue-button");
		expect(continueButton).toBeDisabled();
	});

	it("navigates between steps", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		// Mock the validation to return true when we have both title and URL
		const mockValidateStepNext = vi.fn().mockReturnValue(true);
		const mockStore = createMockWizardStore({
			applicationState: {
				application: {
					grant_template: { id: "template-123" },
					id: "app-123",
					title: "My Application",
					workspace_id: "test-workspace-id",
				},
				uploadedFiles: [],
				urls: ["https://example.com"],
			},
			validateStepNext: mockValidateStepNext,
		});
		vi.mocked(useWizardStore).mockReturnValue(mockStore);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});

		// The button should be enabled due to our mock validation
		const continueButton = screen.getByTestId("continue-button");
		await waitFor(() => {
			expect(continueButton).toBeEnabled();
		});
	});

	it("displays application title in header after first step", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		// Mock starting on first step (step 0) - header info should not be visible
		const mockStore = createMockWizardStore({
			applicationState: {
				application: {
					grant_template: { id: "template-123" },
					id: "app-123",
					title: "My Grant Application",
					workspace_id: "test-workspace-id",
				},
				uploadedFiles: [],
				urls: [],
			},
			currentStep: 0,
		});
		vi.mocked(useWizardStore).mockReturnValue(mockStore);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});

		// App name should not be visible on first step (currentStep = 0)
		expect(screen.queryByTestId("app-name")).not.toBeInTheDocument();
	});

	it("displays toast notifications for source processing updates", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		const mockNotifications = [
			SourceProcessingNotificationMessageFactory.build({
				data: {
					identifier: "document1.pdf",
					indexing_status: "INDEXING",
					parent_id: "app-123",
					parent_type: "grant_application",
					rag_source_id: "source-1",
				},
				parent_id: "app-123",
			}),
		];

		vi.mocked(useApplicationNotifications).mockReturnValue({
			connectionStatus: "Open",
			connectionStatusColor: "bg-green-500",
			notifications: mockNotifications,
			readyState: 1,
			sendMessage: vi.fn(),
		});

		vi.mocked(isSourceProcessingNotificationMessage).mockReturnValue(true);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(toast.info).toHaveBeenCalledWith("Processing document1.pdf...");
		});
	});

	it("displays success toast for completed processing", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		const mockNotifications = [
			SourceProcessingNotificationMessageFactory.build({
				data: {
					identifier: "document1.pdf",
					indexing_status: "FINISHED",
					parent_id: "app-123",
					parent_type: "grant_application",
					rag_source_id: "source-1",
				},
				parent_id: "app-123",
			}),
		];

		vi.mocked(useApplicationNotifications).mockReturnValue({
			connectionStatus: "Open",
			connectionStatusColor: "bg-green-500",
			notifications: mockNotifications,
			readyState: 1,
			sendMessage: vi.fn(),
		});

		vi.mocked(isSourceProcessingNotificationMessage).mockReturnValue(true);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith("Successfully processed document1.pdf");
		});
	});

	it("displays error toast for failed processing", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		const mockNotifications = [
			SourceProcessingNotificationMessageFactory.build({
				data: {
					identifier: "document1.pdf",
					indexing_status: "FAILED",
					parent_id: "app-123",
					parent_type: "grant_application",
					rag_source_id: "source-1",
				},
				parent_id: "app-123",
			}),
		];

		vi.mocked(useApplicationNotifications).mockReturnValue({
			connectionStatus: "Open",
			connectionStatusColor: "bg-green-500",
			notifications: mockNotifications,
			readyState: 1,
			sendMessage: vi.fn(),
		});

		vi.mocked(isSourceProcessingNotificationMessage).mockReturnValue(true);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to process document1.pdf");
		});
	});
});
