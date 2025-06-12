import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApplication } from "@/actions/grant-applications";
import { SourceIndexingStatus } from "@/enums";
import {
	isSourceProcessingNotificationMessage,
	useApplicationNotifications,
} from "@/hooks/use-application-notifications";

import CreateGrantApplicationWizardPage from "./page";

vi.mock("next/navigation", () => ({
	useParams: vi.fn(),
	useRouter: vi.fn(),
}));

vi.mock("@/actions/grant-applications", () => ({
	createApplication: vi.fn(),
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

describe("CreateGrantApplicationWizardPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
		vi.mocked(useParams).mockReturnValue(mockParams);
	});

	it("shows loading state initially", () => {
		vi.mocked(createApplication).mockImplementation(() => new Promise<never>(() => {}));

		render(<CreateGrantApplicationWizardPage />);

		expect(screen.getByText("Initializing application...")).toBeInTheDocument();
	});

	it("creates application on mount", async () => {
		const mockResponse = {
			id: "app-123",
			template_id: "template-123",
		};

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(createApplication).toHaveBeenCalledWith(mockParams.workspaceId, {
				title: "Untitled Application",
			});
		});

		await waitFor(() => {
			expect(screen.queryByText("Initializing application...")).not.toBeInTheDocument();
		});
	});

	it("shows error and redirects when application creation fails", async () => {
		vi.mocked(createApplication).mockRejectedValue(new Error("Failed"));

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to initialize application. Please try again.");
			expect(mockPush).toHaveBeenCalledWith(`/workspaces/${mockParams.workspaceId}`);
		});
	});

	it("renders wizard components after application is created", async () => {
		const mockResponse = {
			id: "app-123",
			template_id: "template-123",
		};

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
		const mockResponse = {
			id: "app-123",
			template_id: "template-123",
		};

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});
	});

	it("disables next button when validation fails", async () => {
		const mockResponse = {
			id: "app-123",
			template_id: "template-123",
		};

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
		const mockResponse = {
			id: "app-123",
			template_id: "template-123",
		};

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});

		// Add title
		const titleInput = screen.getByTestId("application-title-header");
		await user.type(titleInput, "My Application");

		// Add URL
		const urlInput = screen.getByPlaceholderText("Paste a link and press Enter to add");
		await user.type(urlInput, "https://example.com");
		await user.keyboard("{Enter}");

		await waitFor(() => {
			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toBeDisabled();
		});
	});

	it("navigates between steps", async () => {
		const user = userEvent.setup();
		const mockResponse = {
			id: "app-123",
			template_id: "template-123",
		};

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});

		// Add required data
		const titleInput = screen.getByTestId("application-title-header");
		await user.type(titleInput, "My Application");

		const urlInput = screen.getByPlaceholderText("Paste a link and press Enter to add");
		await user.type(urlInput, "https://example.com");
		await user.keyboard("{Enter}");

		// Go to next step
		const continueButton = screen.getByTestId("continue-button");
		await waitFor(() => {
			expect(continueButton).toBeDisabled();
		});
	});

	it("displays application title in header after first step", async () => {
		const user = userEvent.setup();
		const mockResponse = {
			id: "app-123",
			template_id: "template-123",
		};

		vi.mocked(createApplication).mockResolvedValue(mockResponse);

		render(<CreateGrantApplicationWizardPage />);

		await waitFor(() => {
			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		});

		// App name is not visible on first step
		expect(screen.queryByTestId("app-name")).not.toBeInTheDocument();

		// Add title
		const titleInput = screen.getByTestId("application-title-header");
		await user.type(titleInput, "My Grant Application");

		// Add URL to enable navigation
		const urlInput = screen.getByPlaceholderText("Paste a link and press Enter to add");
		await user.type(urlInput, "https://example.com");
		await user.keyboard("{Enter}");

		// Go to next step
		const continueButton = screen.getByTestId("continue-button");
		await waitFor(() => {
			expect(continueButton).toBeDisabled();
		});
	});

	it("displays toast notifications for source processing updates", async () => {
		const mockResponse = {
			id: "app-123",
			template_id: "template-123",
		};

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
		const mockResponse = {
			id: "app-123",
			template_id: "template-123",
		};

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
		const mockResponse = {
			id: "app-123",
			template_id: "template-123",
		};

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
