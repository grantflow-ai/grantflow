import {
	ApplicationFactory,
	GrantTemplateFactory,
	SourceProcessingNotificationMessageFactory,
} from "::testing/factories";
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

const mockPush = vi.fn();
const mockParams = { workspaceId: "test-workspace-id" };
const mockSearchParams = {
	get: vi.fn().mockReturnValue(null),
};

describe("CreateGrantApplicationWizardPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
		vi.mocked(useParams).mockReturnValue(mockParams);
		vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as any);

		// Reset stores to initial state
		useWizardStore.setState({
			currentStep: 0,
			polling: {
				intervalId: null,
				isActive: false,
				start: vi.fn(),
				stop: vi.fn(),
			},
		});

		useApplicationStore.setState({
			application: null,
			applicationTitle: "",
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});
	});

	it("shows loading state initially", () => {
		vi.mocked(createApplication).mockImplementation(() => new Promise<never>(() => {}));

		// Set application store to show loading state
		useApplicationStore.setState({
			application: null,
			isLoading: true,
		});

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

		// Mock the handleApplicationInit function to set application when called
		const mockHandleApplicationInit = vi.fn().mockImplementation(async () => {
			useApplicationStore.setState({ application: mockResponse });
		});

		useApplicationStore.setState({
			application: null,
			handleApplicationInit: mockHandleApplicationInit,
			isLoading: true,
		});

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

		useApplicationStore.setState({
			application: null,
			handleApplicationInit: mockHandleApplicationInit,
			isLoading: true,
		});

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

		// Set application directly with minimal mock for handleApplicationInit
		useApplicationStore.setState({
			application: mockResponse,
			handleApplicationInit: vi.fn().mockResolvedValue(undefined),
		});

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

		// Set application directly with minimal mock for handleApplicationInit
		useApplicationStore.setState({
			application: mockResponse,
			handleApplicationInit: vi.fn().mockResolvedValue(undefined),
		});

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});
	});

	it("disables next button when validation fails", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			title: "Short",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		// Set application with validation data and minimal mock for handleApplicationInit
		useApplicationStore.setState({
			application: mockResponse,
			applicationTitle: "Short", // This should fail validation
			handleApplicationInit: vi.fn().mockResolvedValue(undefined),
			uploadedFiles: [],
			urls: [],
		});

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
			title: "Short",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		// Set application state directly - no need to mock handleApplicationInit
		useApplicationStore.setState({
			application: mockResponse,
			applicationTitle: "Short", // This will fail validation
			uploadedFiles: [], // No files uploaded
			urls: [],
		});

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});

		// Add title only - button should still be disabled without files or urls
		const titleInput = screen.getByTestId("application-title-textarea");
		await user.clear(titleInput);
		await user.type(titleInput, "Short");

		// With title length < 10 chars, the button should remain disabled
		const continueButton = screen.getByTestId("continue-button");
		expect(continueButton).toBeDisabled();
	});

	it("navigates between steps", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			title: "My Application Title That Is Long Enough",
			workspace_id: mockParams.workspaceId,
		});

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		// Set application store with valid data directly - no need to mock handleApplicationInit
		useApplicationStore.setState({
			application: mockResponse,
			applicationTitle: "My Application Title That Is Long Enough",
			uploadedFiles: [],
			urls: ["https://example.com"],
		});

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});

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

		useWizardStore.setState({
			currentStep: 0,
		});

		useApplicationStore.setState({
			application: ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({ id: "template-123" }),
				id: "app-123",
				title: "My Grant Application",
				workspace_id: "test-workspace-id",
			}),
			applicationTitle: "My Grant Application",
			uploadedFiles: [],
			urls: [],
		});

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