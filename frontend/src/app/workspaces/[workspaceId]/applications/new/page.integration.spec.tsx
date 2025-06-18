import { RagProcessingStatusMessageFactory, SourceProcessingNotificationMessageFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SourceIndexingStatus } from "@/enums";
import type { WebsocketMessage } from "@/hooks/use-application-notifications";

import CreateGrantApplicationWizardPage from "./page";

// Mock dependencies
vi.mock("next/navigation", () => ({
	useParams: () => ({ workspaceId: "test-workspace-id" }),
	useRouter: () => ({
		push: vi.fn(),
	}),
	useSearchParams: () => ({
		get: () => null,
	}),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

// Mock the websocket hook
const mockNotifications = vi.fn<() => WebsocketMessage<unknown>[]>(() => []);
const mockConnectionStatus = vi.fn(() => "Open");
const mockConnectionStatusColor = vi.fn(() => "bg-green-500");

vi.mock("@/hooks/use-application-notifications", async () => {
	const actual = await vi.importActual<typeof import("@/hooks/use-application-notifications")>(
		"@/hooks/use-application-notifications",
	);
	return {
		...actual,
		useApplicationNotifications: () => ({
			connectionStatus: mockConnectionStatus(),
			connectionStatusColor: mockConnectionStatusColor(),
			notifications: mockNotifications(),
			readyState: 1, // OPEN
			sendMessage: vi.fn(),
		}),
	};
});

// Mock stores
vi.mock("@/stores/wizard-store", () => ({
	useWizardStore: () => ({
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
		validateStepNext: vi.fn(() => true),
		workspaceId: "test-workspace-id",
		wsConnectionStatus: undefined,
		wsConnectionStatusColor: undefined,
	}),
}));

vi.mock("@/stores/application-store", () => ({
	useApplicationStore: () => ({
		application: {
			id: "test-app-id",
			title: "Test Application",
			workspace_id: "test-workspace-id",
		},
		applicationTitle: "Test Application",
		areFilesOrUrlsIndexing: vi.fn(() => false),
		handleApplicationInit: vi.fn().mockResolvedValue(undefined),
		removeFile: vi.fn(),
		removeUrl: vi.fn(),
		retrieveApplication: vi.fn(),
		uploadedFiles: [],
		urls: [],
	}),
}));

describe("WebSocket Notifications Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockNotifications.mockReturnValue([]);
	});

	it("displays connection status in the UI", async () => {
		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
		});

		// Connection status should be passed to child components
		expect(mockConnectionStatus).toHaveBeenCalled();
		expect(mockConnectionStatusColor).toHaveBeenCalled();
	});

	describe("Source Processing Notifications", () => {
		it("shows info toast for indexing status", async () => {
			const { toast } = await import("sonner");
			const notification = SourceProcessingNotificationMessageFactory.build({
				data: {
					identifier: "document.pdf",
					indexing_status: SourceIndexingStatus.INDEXING,
					parent_id: "test-app-id",
					parent_type: "grant_template",
					rag_source_id: "source-1",
				},
				parent_id: "test-app-id",
			});

			mockNotifications.mockReturnValue([notification]);
			render(<CreateGrantApplicationWizardPage />);

			await waitFor(() => {
				expect(toast.info).toHaveBeenCalledWith("Processing document.pdf...");
			});
		});

		it("shows success toast when indexing finishes", async () => {
			const { toast } = await import("sonner");
			const notification = SourceProcessingNotificationMessageFactory.build({
				data: {
					identifier: "research-paper.pdf",
					indexing_status: SourceIndexingStatus.FINISHED,
					parent_id: "test-app-id",
					parent_type: "grant_template",
					rag_source_id: "source-2",
				},
				parent_id: "test-app-id",
			});

			mockNotifications.mockReturnValue([notification]);
			render(<CreateGrantApplicationWizardPage />);

			await waitFor(() => {
				expect(toast.success).toHaveBeenCalledWith("Successfully processed research-paper.pdf");
			});
		});

		it("shows error toast when indexing fails", async () => {
			const { toast } = await import("sonner");
			const notification = SourceProcessingNotificationMessageFactory.build({
				data: {
					identifier: "broken-file.pdf",
					indexing_status: SourceIndexingStatus.FAILED,
					parent_id: "test-app-id",
					parent_type: "grant_template",
					rag_source_id: "source-3",
				},
				parent_id: "test-app-id",
			});

			mockNotifications.mockReturnValue([notification]);
			render(<CreateGrantApplicationWizardPage />);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Failed to process broken-file.pdf");
			});
		});
	});

	describe("RAG Processing Status Notifications", () => {
		it("shows info toast for RAG processing events", async () => {
			const { toast } = await import("sonner");
			const notification = RagProcessingStatusMessageFactory.build({
				data: {
					data: undefined, // Explicitly no data for this test
					event: "grant_template_extraction",
					message: "Extracting grant application sections from CFP content...",
				},
				event: "grant_template_extraction",
				parent_id: "test-app-id",
			});

			mockNotifications.mockReturnValue([notification]);
			render(<CreateGrantApplicationWizardPage />);

			await waitFor(() => {
				expect(toast.info).toHaveBeenCalledWith("Extracting grant application sections from CFP content...");
			});
		});

		it("shows info toast with description for RAG processing events with data", async () => {
			const { toast } = await import("sonner");
			const notification = RagProcessingStatusMessageFactory.build({
				data: {
					data: {
						organization: "National Science Foundation",
						section_count: 5,
					},
					event: "sections_extracted",
					message: "Sections extracted successfully",
				},
				event: "sections_extracted",
				parent_id: "test-app-id",
			});

			mockNotifications.mockReturnValue([notification]);
			render(<CreateGrantApplicationWizardPage />);

			await waitFor(() => {
				expect(toast.info).toHaveBeenCalledWith("Sections extracted successfully", {
					description: expect.stringContaining("section_count: 5"),
				});
				expect(toast.info).toHaveBeenCalledWith("Sections extracted successfully", {
					description: expect.stringContaining("organization: National Science Foundation"),
				});
			});
		});

		it("handles multiple notifications in sequence", async () => {
			const { toast } = await import("sonner");
			const ragNotification = RagProcessingStatusMessageFactory.build({
				data: {
					data: undefined, // Explicitly no data
					event: "grant_template_extraction",
					message: "Starting extraction...",
				},
				event: "grant_template_extraction",
				parent_id: "test-app-id",
			});
			const sourceNotification = SourceProcessingNotificationMessageFactory.build({
				data: {
					identifier: "file1.pdf",
					indexing_status: SourceIndexingStatus.INDEXING,
					parent_id: "test-app-id",
					parent_type: "grant_template",
					rag_source_id: "source-4",
				},
				parent_id: "test-app-id",
			});
			const notifications: WebsocketMessage<unknown>[] = [ragNotification, sourceNotification];

			// First render with first notification
			mockNotifications.mockReturnValue([notifications[0]]);
			const { rerender } = render(<CreateGrantApplicationWizardPage />);

			await waitFor(() => {
				expect(toast.info).toHaveBeenCalledWith("Starting extraction...");
			});

			// Update with both notifications
			mockNotifications.mockReturnValue(notifications);
			rerender(<CreateGrantApplicationWizardPage />);

			await waitFor(() => {
				expect(toast.info).toHaveBeenCalledWith("Processing file1.pdf...");
			});
		});
	});

	describe("Connection Status", () => {
		it("updates UI when connection status changes", async () => {
			mockConnectionStatus.mockReturnValue("Connecting");
			mockConnectionStatusColor.mockReturnValue("bg-yellow-500");

			const { rerender } = render(<CreateGrantApplicationWizardPage />);

			await waitFor(() => {
				expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
			});

			// Simulate connection established
			mockConnectionStatus.mockReturnValue("Open");
			mockConnectionStatusColor.mockReturnValue("bg-green-500");
			rerender(<CreateGrantApplicationWizardPage />);

			// The connection status is passed to child components
			expect(mockConnectionStatus).toHaveBeenCalled();
		});
	});
});
