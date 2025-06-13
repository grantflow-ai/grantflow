import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory } from "::testing/factories";
import { createApplication } from "@/actions/grant-applications";
import { SourceIndexingStatus } from "@/enums";
import {
	isSourceProcessingNotificationMessage,
	useApplicationNotifications,
} from "@/hooks/use-application-notifications";
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

const mockPush = vi.fn();
const mockParams = { workspaceId: "test-workspace-id" };

const createMockWizardStore = (overrides = {}) => ({
	addFile: vi.fn(),
	addUrl: vi.fn(),
	applicationId: "app-123",
	applicationTitle: "Untitled Application",
	currentStep: 0,
	goToNextStep: vi.fn(),
	goToPreviousStep: vi.fn(),
	initializeApplication: vi.fn(),
	isCreatingApplication: false,
	isCurrentStepValid: vi.fn().mockReturnValue(false),
	isStep1Valid: vi.fn().mockReturnValue(false),
	removeFile: vi.fn(),
	removeUrl: vi.fn(),
	resetWizard: vi.fn(),
	setApplicationId: vi.fn(),
	setApplicationTitle: vi.fn(),
	setCurrentStep: vi.fn(),
	setFileDropdownOpen: vi.fn(),
	setIsCreatingApplication: vi.fn(),
	setLinkHoverState: vi.fn(),
	setTemplateId: vi.fn(),
	setUploadedFiles: vi.fn(),
	setUrlInput: vi.fn(),
	setUrls: vi.fn(),
	setWorkspaceId: vi.fn(),
	templateId: "template-123",
	ui: {
		fileDropdownStates: {},
		linkHoverStates: {},
		urlInput: "",
	},
	updateApplicationTitle: vi.fn(),
	uploadedFiles: [],
	urls: [],
	workspaceId: "test-workspace-id",
	...overrides,
});

describe("CreateGrantApplicationWizardPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
		vi.mocked(useParams).mockReturnValue(mockParams);
		vi.mocked(useWizardStore).mockReturnValue(createMockWizardStore());
	});

	it("shows loading state initially", () => {
		vi.mocked(createApplication).mockImplementation(() => new Promise<never>(() => {}));

		// Mock store to show loading state
		const mockStore = createMockWizardStore({
			isCreatingApplication: true,
		});
		vi.mocked(useWizardStore).mockReturnValue(mockStore);

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

		// Mock the store with actual implementation that calls createApplication
		const mockInitializeApplication = vi.fn().mockImplementation(async (workspaceId: string) => {
			await createApplication(workspaceId, { title: "Untitled Application" });
		});

		const mockStore = createMockWizardStore({
			initializeApplication: mockInitializeApplication,
			isCreatingApplication: true,
		});
		vi.mocked(useWizardStore).mockReturnValue(mockStore);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(createApplication).toHaveBeenCalledWith(mockParams.workspaceId, {
				title: "Untitled Application",
			});
		});

		await waitFor(() => {
			expect(mockInitializeApplication).toHaveBeenCalledWith(mockParams.workspaceId);
		});
	});

	it("shows error and redirects when application creation fails", async () => {
		vi.mocked(createApplication).mockRejectedValue(new Error("Failed"));

		// Mock the store with implementation that will fail
		const mockInitializeApplication = vi.fn().mockImplementation(async (workspaceId: string) => {
			await createApplication(workspaceId, { title: "Untitled Application" });
		});

		const mockStore = createMockWizardStore({
			initializeApplication: mockInitializeApplication,
			isCreatingApplication: true,
		});
		vi.mocked(useWizardStore).mockReturnValue(mockStore);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to initialize application");
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
		const mockStore = createMockWizardStore({
			applicationTitle: "My Application",
			isCurrentStepValid: vi.fn().mockReturnValue(false), // Validation should fail
			isStep1Valid: vi.fn().mockReturnValue(false), // Step 1 should be invalid
			uploadedFiles: [], // No files uploaded
			urls: ["https://example.com"],
		});
		vi.mocked(useWizardStore).mockReturnValue(mockStore);

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
		const user = userEvent.setup();
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});

		// Add required data
		const titleInput = screen.getByTestId("application-title-textarea");
		await user.clear(titleInput);
		await user.type(titleInput, "My Application");

		const urlInput = screen.getByPlaceholderText("Paste a link and press Enter to add");
		await user.type(urlInput, "https://example.com");
		await user.keyboard("{Enter}");

		// After adding both title and URL, the button should be enabled
		const continueButton = screen.getByTestId("continue-button");
		await waitFor(() => {
			expect(continueButton).toBeEnabled();
		});
	});

	it("displays application title in header after first step", async () => {
		const user = userEvent.setup();
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});

		// App name is not visible on first step
		expect(screen.queryByTestId("app-name")).not.toBeInTheDocument();

		// Add title
		const titleInput = screen.getByTestId("application-title-textarea");
		await user.clear(titleInput);
		await user.type(titleInput, "My Grant Application");

		// Add URL to enable navigation
		const urlInput = screen.getByPlaceholderText("Paste a link and press Enter to add");
		await user.type(urlInput, "https://example.com");
		await user.keyboard("{Enter}");

		// After adding title and URL, the button should be enabled
		const continueButton = screen.getByTestId("continue-button");
		await waitFor(() => {
			expect(continueButton).toBeEnabled();
		});
	});

	it("displays toast notifications for source processing updates", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		const mockNotifications = [
			{
				data: {
					identifier: "document1.pdf",
					indexing_status: SourceIndexingStatus.INDEXING,
					parent_id: "app-123",
					parent_type: "grant_application",
					rag_source_id: "source-1",
				},
				event: "source_processing",
				parent_id: "app-123",
				type: "data" as const,
			},
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
			{
				data: {
					identifier: "document1.pdf",
					indexing_status: SourceIndexingStatus.FINISHED,
					parent_id: "app-123",
					parent_type: "grant_application",
					rag_source_id: "source-1",
				},
				event: "source_processing",
				parent_id: "app-123",
				type: "data" as const,
			},
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
			{
				data: {
					identifier: "document1.pdf",
					indexing_status: SourceIndexingStatus.FAILED,
					parent_id: "app-123",
					parent_type: "grant_application",
					rag_source_id: "source-1",
				},
				event: "source_processing",
				parent_id: "app-123",
				type: "data" as const,
			},
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
