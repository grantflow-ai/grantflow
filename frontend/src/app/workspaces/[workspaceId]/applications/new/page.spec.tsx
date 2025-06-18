import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory, SourceProcessingNotificationMessageFactory } from "::testing/factories";
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
		});
		useApplicationStore.setState({
			application: null,
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});
	});

	it("shows loading state initially", () => {
		vi.mocked(createApplication).mockImplementation(() => new Promise<never>(() => {}));

		// Set stores to show loading state
		useApplicationStore.setState({
			application: null,
			isLoading: true,
			uploadedFiles: [],
			urls: [],
		});

		render(<CreateGrantApplicationWizardPage />);

		// When no applicationId is in search params, it shows an empty loading state
		const loadingContainer = screen.getByText((_, element) => {
			return element?.className === "text-center";
		});
		expect(loadingContainer).toBeInTheDocument();
	});

	it("shows first step by default", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			workspace_id: mockParams.workspaceId,
		});

		// Set up the application store with the mock application
		useApplicationStore.setState({
			application: mockResponse,
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});
	});

	it("disables next button when validation fails", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			title: "", // Empty title to fail validation
			workspace_id: mockParams.workspaceId,
		});

		useApplicationStore.setState({
			application: mockResponse,
			isLoading: false,
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
			title: "My Application",
			workspace_id: mockParams.workspaceId,
		});

		useApplicationStore.setState({
			application: mockResponse,
			isLoading: false,
			uploadedFiles: [], // No files uploaded
			urls: [], // No URLs
		});

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
			title: "My Application with Long Title", // Make title longer to ensure it passes MIN_TITLE_LENGTH
			workspace_id: mockParams.workspaceId,
		});

		// Mock handleApplicationInit to prevent it from overriding our state
		const originalHandleApplicationInit = useApplicationStore.getState().handleApplicationInit;
		useApplicationStore.setState({
			application: mockResponse,
			handleApplicationInit: vi.fn().mockResolvedValue(undefined),
			isLoading: false,
			uploadedFiles: [],
			urls: ["https://example.com"], // Has URL for validation
		});

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});

		// The next button should be enabled with title and URL
		const continueButton = screen.getByTestId("continue-button");
		expect(continueButton).not.toBeDisabled();

		// Restore original function
		useApplicationStore.setState({ handleApplicationInit: originalHandleApplicationInit });
	});

	it("displays application title in header after first step", async () => {
		const mockResponse = ApplicationFactory.build({
			id: "app-123",
			title: "My Test Application",
			workspace_id: mockParams.workspaceId,
		});

		useApplicationStore.setState({
			application: mockResponse,
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});
		useWizardStore.setState({
			currentStep: 1,
		});

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("app-name")).toBeInTheDocument();
		});

		expect(screen.getByTestId("app-name")).toHaveTextContent("My Test Application");
	});

	it("displays toast notifications for source processing updates", () => {
		const mockNotification = SourceProcessingNotificationMessageFactory.build({
			data: {
				identifier: "test-file.pdf",
				indexing_status: "INDEXING",
				parent_id: "app-123",
				parent_type: "grant_application",
				rag_source_id: "source-123",
			},
		});

		vi.mocked(isSourceProcessingNotificationMessage).mockReturnValue(true);
		vi.mocked(useApplicationNotifications).mockReturnValue({
			connectionStatus: "Open",
			connectionStatusColor: "bg-green-500",
			notifications: [mockNotification],
			readyState: 1,
			sendMessage: vi.fn(),
		});

		const mockResponse = ApplicationFactory.build();
		useApplicationStore.setState({
			application: mockResponse,
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});

		render(<CreateGrantApplicationWizardPage />);

		expect(toast.info).toHaveBeenCalledWith("Processing test-file.pdf...");
	});

	it("displays success toast for completed processing", () => {
		const mockNotification = SourceProcessingNotificationMessageFactory.build({
			data: {
				identifier: "test-file.pdf",
				indexing_status: "FINISHED",
				parent_id: "app-123",
				parent_type: "grant_application",
				rag_source_id: "source-123",
			},
		});

		vi.mocked(isSourceProcessingNotificationMessage).mockReturnValue(true);
		vi.mocked(useApplicationNotifications).mockReturnValue({
			connectionStatus: "Open",
			connectionStatusColor: "bg-green-500",
			notifications: [mockNotification],
			readyState: 1,
			sendMessage: vi.fn(),
		});

		const mockResponse = ApplicationFactory.build();
		useApplicationStore.setState({
			application: mockResponse,
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});

		render(<CreateGrantApplicationWizardPage />);

		expect(toast.success).toHaveBeenCalledWith("Successfully processed test-file.pdf");
	});

	it("displays error toast for failed processing", () => {
		const mockNotification = SourceProcessingNotificationMessageFactory.build({
			data: {
				identifier: "test-file.pdf",
				indexing_status: "FAILED",
				parent_id: "app-123",
				parent_type: "grant_application",
				rag_source_id: "source-123",
			},
		});

		vi.mocked(isSourceProcessingNotificationMessage).mockReturnValue(true);
		vi.mocked(useApplicationNotifications).mockReturnValue({
			connectionStatus: "Open",
			connectionStatusColor: "bg-green-500",
			notifications: [mockNotification],
			readyState: 1,
			sendMessage: vi.fn(),
		});

		const mockResponse = ApplicationFactory.build();
		useApplicationStore.setState({
			application: mockResponse,
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});

		render(<CreateGrantApplicationWizardPage />);

		expect(toast.error).toHaveBeenCalledWith("Failed to process test-file.pdf");
	});
});
